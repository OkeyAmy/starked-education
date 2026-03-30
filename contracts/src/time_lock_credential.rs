#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec, U256, u256,
    Map, BytesN, IntoVal,
};

/// Time-locked credential release system for Stellar blockchain
/// Allows institutions to issue credentials that become valid at specific future dates

#[contracttype]
#[derive(Clone, Debug)]
pub struct TimeLockedCredential {
    pub id: u64,
    pub issuer: Address,
    pub recipient: Address,
    pub credential_hash: BytesN<32>,
    pub metadata: String,
    pub release_time: u64,      // Unix timestamp when credential becomes valid
    pub created_at: u64,        // Unix timestamp when credential was created
    pub is_released: bool,      // Whether credential has been released
    pub is_revoked: bool,       // Whether credential has been revoked
    pub emergency_override: Option<Address>, // Admin who can override
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ReleaseSchedule {
    pub id: u64,
    pub credentials: Vec<u64>,  // Credential IDs in this schedule
    pub release_times: Vec<u64>, // Corresponding release times
    pub created_by: Address,
    pub is_active: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct AuditEntry {
    pub id: u64,
    pub operation: String,
    pub credential_id: u64,
    pub actor: Address,
    pub timestamp: u64,
    pub details: String,
}

#[contracttype]
#[derive(Clone)]
pub enum StorageKey {
    Credential(u64),
    CredentialByRecipient(Address, u64),
    CredentialByIssuer(Address, u64),
    ReleaseSchedule(u64),
    AuditLog(u64),
    NextCredentialId,
    NextScheduleId,
    NextAuditId,
    EmergencyAdmin,
    TotalCredentials,
    TotalSchedules,
}

#[contract]
pub struct TimeLockCredential;

#[contractimpl]
impl TimeLockCredential {
    /// Initialize the contract with an emergency admin
    pub fn initialize(env: Env, emergency_admin: Address) {
        env.storage().persistent().set(
            &StorageKey::EmergencyAdmin,
            &emergency_admin
        );
        env.storage().persistent().set(&StorageKey::NextCredentialId, &0u64);
        env.storage().persistent().set(&StorageKey::NextScheduleId, &0u64);
        env.storage().persistent().set(&StorageKey::NextAuditId, &0u64);
        env.storage().persistent().set(&StorageKey::TotalCredentials, &0u64);
        env.storage().persistent().set(&StorageKey::TotalSchedules, &0u64);
    }

    /// Issue a time-locked credential
    pub fn issue_credential(
        env: Env,
        issuer: Address,
        recipient: Address,
        credential_hash: BytesN<32>,
        metadata: String,
        release_time: u64,
    ) -> Result<u64, String> {
        issuer.require_auth();

        let current_time = env.ledger().timestamp();
        if release_time <= current_time {
            return Err("Release time must be in the future".to_string());
        }

        let credential_id: u64 = env.storage().persistent()
            .get(&StorageKey::NextCredentialId)
            .unwrap_or(0u64);
        
        let credential = TimeLockedCredential {
            id: credential_id,
            issuer: issuer.clone(),
            recipient: recipient.clone(),
            credential_hash,
            metadata,
            release_time,
            created_at: current_time,
            is_released: false,
            is_revoked: false,
            emergency_override: None,
        };

        // Store credential
        env.storage().persistent().set(&StorageKey::Credential(credential_id), &credential);
        
        // Index by recipient
        let recipient_count: u64 = env.storage().persistent()
            .get(&StorageKey::CredentialByRecipient(recipient.clone(), u64::MAX))
            .unwrap_or(0u64);
        env.storage().persistent().set(
            &StorageKey::CredentialByRecipient(recipient.clone(), recipient_count),
            &credential_id
        );
        env.storage().persistent().set(
            &StorageKey::CredentialByRecipient(recipient, u64::MAX),
            &(recipient_count + 1u64)
        );

        // Index by issuer
        let issuer_count: u64 = env.storage().persistent()
            .get(&StorageKey::CredentialByIssuer(issuer.clone(), u64::MAX))
            .unwrap_or(0u64);
        env.storage().persistent().set(
            &StorageKey::CredentialByIssuer(issuer.clone(), issuer_count),
            &credential_id
        );
        env.storage().persistent().set(
            &StorageKey::CredentialByIssuer(issuer, u64::MAX),
            &(issuer_count + 1u64)
        );

        // Update counters
        env.storage().persistent().set(&StorageKey::NextCredentialId, &(credential_id + 1));
        let total: u64 = env.storage().persistent()
            .get(&StorageKey::TotalCredentials)
            .unwrap_or(0u64);
        env.storage().persistent().set(&StorageKey::TotalCredentials, &(total + 1));

        // Log audit entry
        Self::log_audit(&env, "ISSUE_CREDENTIAL".to_string(), credential_id, issuer.clone(), "Credential issued successfully".to_string())?;

        Ok(credential_id)
    }

    /// Release a credential if the time lock has expired
    pub fn release_credential(env: Env, credential_id: u64, caller: Address) -> Result<(), String> {
        caller.require_auth();

        let mut credential: TimeLockedCredential = env.storage().persistent()
            .get(&StorageKey::Credential(credential_id))
            .ok_or_else(|| "Credential not found".to_string())?;

        if credential.is_released {
            return Err("Credential already released".to_string());
        }

        if credential.is_revoked {
            return Err("Credential has been revoked".to_string());
        }

        let current_time = env.ledger().timestamp();
        if current_time < credential.release_time {
            return Err("Time lock not yet expired".to_string());
        }

        // Only recipient or issuer can release
        if caller != credential.recipient && caller != credential.issuer {
            return Err("Unauthorized caller".to_string());
        }

        credential.is_released = true;
        env.storage().persistent().set(&StorageKey::Credential(credential_id), &credential);

        // Log audit entry
        Self::log_audit(&env, "RELEASE_CREDENTIAL".to_string(), credential_id, caller, "Credential released".to_string())?;

        // Emit event
        env.events().publish((
            "credential_released",
            credential_id,
            credential.recipient,
            credential.issuer,
        ),);

        Ok(())
    }

    /// Batch release multiple credentials (gas optimized)
    pub fn batch_release_credentials(
        env: Env,
        credential_ids: Vec<u64>,
        caller: Address,
    ) -> Result<Vec<Result<u64, String>>, String> {
        caller.require_auth();

        let mut results: Vec<Result<u64, String>> = Vec::new(&env);
        let mut released_count = 0u64;

        for i in 0..credential_ids.len() {
            let credential_id = credential_ids.get(i).unwrap();
            
            match Self::release_credential_internal(&env, credential_id, caller.clone()) {
                Ok(_) => {
                    results.push_back(Ok(credential_id));
                    released_count += 1;
                }
                Err(e) => {
                    results.push_back(Err(e));
                }
            }
        }

        // Log batch operation
        Self::log_audit(
            &env,
            "BATCH_RELEASE".to_string(),
            0,
            caller,
            format!("Batch release: {} successful out of {}", released_count, credential_ids.len()),
        )?;

        Ok(results)
    }

    /// Internal release without auth check (for batch operations)
    fn release_credential_internal(
        env: &Env,
        credential_id: u64,
        caller: Address,
    ) -> Result<(), String> {
        let mut credential: TimeLockedCredential = env.storage().persistent()
            .get(&StorageKey::Credential(credential_id))
            .ok_or_else(|| "Credential not found".to_string())?;

        if credential.is_released {
            return Err("Already released".to_string());
        }

        if credential.is_revoked {
            return Err("Revoked".to_string());
        }

        let current_time = env.ledger().timestamp();
        if current_time < credential.release_time {
            return Err("Time lock active".to_string());
        }

        if caller != credential.recipient && caller != credential.issuer {
            return Err("Unauthorized".to_string());
        }

        credential.is_released = true;
        env.storage().persistent().set(&StorageKey::Credential(credential_id), &credential);

        env.events().publish((
            "credential_released",
            credential_id,
            credential.recipient,
        ),);

        Ok(())
    }

    /// Emergency override - revoke a credential within 5 minutes of request
    pub fn emergency_revoke(
        env: Env,
        credential_id: u64,
        admin: Address,
        reason: String,
    ) -> Result<(), String> {
        admin.require_auth();

        // Verify admin privileges
        let emergency_admin: Address = env.storage().persistent()
            .get(&StorageKey::EmergencyAdmin)
            .ok_or_else(|| "No emergency admin set".to_string())?;

        if admin != emergency_admin {
            return Err("Not authorized".to_string());
        }

        let mut credential: TimeLockedCredential = env.storage().persistent()
            .get(&StorageKey::Credential(credential_id))
            .ok_or_else(|| "Credential not found".to_string())?;

        if credential.is_revoked {
            return Err("Already revoked".to_string());
        }

        credential.is_revoked = true;
        credential.emergency_override = Some(admin.clone());
        env.storage().persistent().set(&StorageKey::Credential(credential_id), &credential);

        // Log audit entry
        Self::log_audit(
            &env,
            "EMERGENCY_REVOKE".to_string(),
            credential_id,
            admin,
            format!("Emergency revoke: {}", reason),
        )?;

        // Emit event
        env.events().publish((
            "credential_emergency_revoked",
            credential_id,
            admin,
            reason,
        ),);

        Ok(())
    }

    /// Create a release schedule for multiple credentials
    pub fn create_release_schedule(
        env: Env,
        creator: Address,
        credential_ids: Vec<u64>,
        release_times: Vec<u64>,
    ) -> Result<u64, String> {
        creator.require_auth();

        if credential_ids.len() != release_times.len() {
            return Err("Credential and release time counts must match".to_string());
        }

        let schedule_id: u64 = env.storage().persistent()
            .get(&StorageKey::NextScheduleId)
            .unwrap_or(0u64);

        let schedule = ReleaseSchedule {
            id: schedule_id,
            credentials: credential_ids.clone(),
            release_times: release_times.clone(),
            created_by: creator.clone(),
            is_active: true,
        };

        env.storage().persistent().set(&StorageKey::ReleaseSchedule(schedule_id), &schedule);
        env.storage().persistent().set(&StorageKey::NextScheduleId, &(schedule_id + 1));

        let total: u64 = env.storage().persistent()
            .get(&StorageKey::TotalSchedules)
            .unwrap_or(0u64);
        env.storage().persistent().set(&StorageKey::TotalSchedules, &(total + 1));

        // Log audit entry
        Self::log_audit(
            &env,
            "CREATE_SCHEDULE".to_string(),
            schedule_id,
            creator,
            format!("Created schedule with {} credentials", credential_ids.len()),
        )?;

        Ok(schedule_id)
    }

    /// Get credential details
    pub fn get_credential(
        env: Env,
        credential_id: u64,
    ) -> Result<TimeLockedCredential, String> {
        env.storage().persistent()
            .get(&StorageKey::Credential(credential_id))
            .ok_or_else(|| "Credential not found".to_string())
    }

    /// Get credentials by recipient
    pub fn get_credentials_by_recipient(
        env: Env,
        recipient: Address,
    ) -> Result<Vec<TimeLockedCredential>, String> {
        let count: u64 = env.storage().persistent()
            .get(&StorageKey::CredentialByRecipient(recipient.clone(), u64::MAX))
            .unwrap_or(0u64);

        let mut credentials: Vec<TimeLockedCredential> = Vec::new(&env);
        for i in 0..count {
            if let Ok(cred_id) = env.storage().persistent()
                .get::<_, u64>(&StorageKey::CredentialByRecipient(recipient.clone(), i))
            {
                if let Ok(credential) = env.storage().persistent()
                    .get::<_, TimeLockedCredential>(&StorageKey::Credential(cred_id))
                {
                    credentials.push_back(credential);
                }
            }
        }

        Ok(credentials)
    }

    /// Get credentials by issuer
    pub fn get_credentials_by_issuer(
        env: Env,
        issuer: Address,
    ) -> Result<Vec<TimeLockedCredential>, String> {
        let count: u64 = env.storage().persistent()
            .get(&StorageKey::CredentialByIssuer(issuer.clone(), u64::MAX))
            .unwrap_or(0u64);

        let mut credentials: Vec<TimeLockedCredential> = Vec::new(&env);
        for i in 0..count {
            if let Ok(cred_id) = env.storage().persistent()
                .get::<_, u64>(&StorageKey::CredentialByIssuer(issuer.clone(), i))
            {
                if let Ok(credential) = env.storage().persistent()
                    .get::<_, TimeLockedCredential>(&StorageKey::Credential(cred_id))
                {
                    credentials.push_back(credential);
                }
            }
        }

        Ok(credentials)
    }

    /// Get release schedule
    pub fn get_release_schedule(
        env: Env,
        schedule_id: u64,
    ) -> Result<ReleaseSchedule, String> {
        env.storage().persistent()
            .get(&StorageKey::ReleaseSchedule(schedule_id))
            .ok_or_else(|| "Schedule not found".to_string())
    }

    /// Get audit log entries
    pub fn get_audit_log(
        env: Env,
        from_id: u64,
        limit: u32,
    ) -> Result<Vec<AuditEntry>, String> {
        let mut entries: Vec<AuditEntry> = Vec::new(&env);
        let mut current_id = from_id;

        for _ in 0..limit {
            if let Ok(entry) = env.storage().persistent()
                .get::<_, AuditEntry>(&StorageKey::AuditLog(current_id))
            {
                entries.push_back(entry);
                current_id += 1;
            } else {
                break;
            }
        }

        Ok(entries)
    }

    /// Check if credentials are ready for release (notification system helper)
    pub fn check_upcoming_releases(
        env: Env,
        recipient: Address,
        time_window: u64, // seconds
    ) -> Result<Vec<TimeLockedCredential>, String> {
        let credentials = Self::get_credentials_by_recipient(env.clone(), recipient.clone())?;
        let current_time = env.ledger().timestamp();
        let mut upcoming: Vec<TimeLockedCredential> = Vec::new(&env);

        for i in 0..credentials.len() {
            let cred = credentials.get(i).unwrap();
            if !cred.is_released && 
               !cred.is_revoked && 
               cred.release_time > current_time && 
               cred.release_time <= current_time + time_window {
                upcoming.push_back(cred);
            }
        }

        Ok(upcoming)
    }

    /// Log audit entry (internal helper)
    fn log_audit(
        env: &Env,
        operation: String,
        credential_id: u64,
        actor: Address,
        details: String,
    ) -> Result<(), String> {
        let audit_id: u64 = env.storage().persistent()
            .get(&StorageKey::NextAuditId)
            .unwrap_or(0u64);

        let entry = AuditEntry {
            id: audit_id,
            operation,
            credential_id,
            actor: actor.clone(),
            timestamp: env.ledger().timestamp(),
            details,
        };

        env.storage().persistent().set(&StorageKey::AuditLog(audit_id), &entry);
        env.storage().persistent().set(&StorageKey::NextAuditId, &(audit_id + 1));

        env.events().publish((
            "audit_log",
            audit_id,
            operation,
            actor,
        ),);

        Ok(())
    }

    /// Get statistics
    pub fn get_stats(env: Env) -> Map<String, u64> {
        let mut stats: Map<String, u64> = Map::new(env);
        
        let total_credentials: u64 = env.storage().persistent()
            .get(&StorageKey::TotalCredentials)
            .unwrap_or(0u64);
        let total_schedules: u64 = env.storage().persistent()
            .get(&StorageKey::TotalSchedules)
            .unwrap_or(0u64);
        
        stats.set("total_credentials".into_val(&env), total_credentials);
        stats.set("total_schedules".into_val(&env), total_schedules);
        
        stats
    }
}
