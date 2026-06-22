use crate::utils::storage::{EntityType, StorageUtils};
use soroban_sdk::{contracttype, panic_with_error, Address, Env, String, Symbol, Vec};

/// Credential status enumeration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CredentialStatus {
    Active = 0,
    Expired = 1,
    Revoked = 2,
    Pending = 3,
}

impl CredentialStatus {
    pub fn to_u8(&self) -> u8 {
        match self {
            CredentialStatus::Active => 0,
            CredentialStatus::Expired => 1,
            CredentialStatus::Revoked => 2,
            CredentialStatus::Pending => 3,
        }
    }

    pub fn from_u8(value: u8) -> Self {
        match value {
            0 => CredentialStatus::Active,
            1 => CredentialStatus::Expired,
            2 => CredentialStatus::Revoked,
            3 => CredentialStatus::Pending,
            _ => CredentialStatus::Pending,
        }
    }
}

/// Enhanced credential with expiration support
#[contracttype]
#[derive(Clone)]
pub struct CredentialRegistry {
    pub id: u64,
    pub issuer: Address,
    pub recipient: Address,
    pub title: String,
    pub description: String,
    pub course_id: String,
    pub timestamps: PackedTimestamps,
    pub status: CredentialStatus,
    pub ipfs_hash: String,
    pub renewal_count: u32,
    pub last_renewed_at: Option<u64>,
}

/// Credential registry storage keys
#[contracttype]
pub enum CredentialRegistryKey {
    Credential(u64),
    UserCredentials(Address),
    CredentialCount,
    ExpiredCredentials,
    RenewalHistory(u64), // credential_id -> Vec<RenewalRecord>
}

/// Renewal record for tracking credential renewals
#[contracttype]
#[derive(Clone)]
pub struct RenewalRecord {
    pub renewed_at: u64,
    pub old_expires_at: u64,
    pub new_expires_at: u64,
    pub renewed_by: Address,
}

/// Events for credential operations
#[contracttype]
#[derive(Clone)]
pub enum CredentialEvent {
    Issued(u64),        // credential_id
    Expired(u64),       // credential_id
    Renewed(u64),       // credential_id
    Revoked(u64),       // credential_id
    StatusChanged(u64), // credential_id
}

/// Issue a new credential with expiration support
pub fn issue_credential_with_expiration(
    env: &Env,
    issuer: Address,
    recipient: Address,
    title: String,
    description: String,
    course_id: String,
    ipfs_hash: String,
    validity_duration: u64, // Duration in seconds from issuance
) -> u64 {
    issuer.require_auth();

    let admin: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(env, "admin"))
        .unwrap_or_else(|| panic!("Admin not found"));

    if issuer != admin {
        panic!("Unauthorized issuer");
    }

    let credential_id = StorageUtils::get_next_id(env, EntityType::Credential);
    let current_time = env.ledger().timestamp();

    let credential = CredentialRegistry {
        id: credential_id,
        issuer: issuer.clone(),
        recipient: recipient.clone(),
        title,
        description,
        course_id,
        issued_at: current_time,
        expires_at: current_time + validity_duration,
        status: CredentialStatus::Active,
        ipfs_hash,
        renewal_count: 0,
        last_renewed_at: None,
    };

    // Store credential
    env.storage().persistent().set(
        &CredentialRegistryKey::Credential(credential_id),
        &credential,
    );

    // Add to user's credential list
    let mut user_creds = env
        .storage()
        .persistent()
        .get(&CredentialRegistryKey::UserCredentials(recipient.clone()))
        .unwrap_or_else(|| Vec::new(env));
    user_creds.push_back(credential_id);
    env.storage().persistent().set(
        &CredentialRegistryKey::UserCredentials(recipient),
        &user_creds,
    );

    // Update credential count
    env.storage()
        .instance()
        .set(&CredentialRegistryKey::CredentialCount, &credential_id);

    // Emit event
    env.events().publish(
        (Symbol::new(env, "credential"), Symbol::new(env, "issued")),
        (credential_id, issuer.clone()),
    );

    credential_id
}

/// Renew an existing credential
pub fn renew_credential(
    env: &Env,
    credential_id: u64,
    renewer: Address,
    extension_duration: u64,
) -> bool {
    renewer.require_auth();

    let mut credential: CredentialRegistry = env
        .storage()
        .persistent()
        .get(&CredentialRegistryKey::Credential(credential_id))
        .unwrap_or_else(|| panic!("Credential not found"));

    // Check if renewer is authorized (admin or credential recipient)
    let admin: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(env, "admin"))
        .unwrap_or_else(|| panic!("Admin not found"));

    if renewer != admin && renewer != credential.recipient {
        panic!("Unauthorized to renew credential");
    }

    // Check if credential is eligible for renewal
    match credential.status {
        CredentialStatus::Revoked => {
            panic!("Cannot renew revoked credential");
        }
        CredentialStatus::Expired => {
            // Allow renewal of expired credentials
        }
        _ => {} // Active and Pending can be renewed
    }

    let current_time = env.ledger().timestamp();
    let old_expires_at = credential.expires_at;

    // Create renewal record
    let renewal_record = RenewalRecord {
        renewed_at: current_time,
        old_expires_at,
        new_expires_at: current_time + extension_duration,
        renewed_by: renewer.clone(),
    };

    // Store renewal history
    let mut renewal_history = env
        .storage()
        .instance()
        .get(&CredentialRegistryKey::RenewalHistory(credential_id))
        .unwrap_or_else(|| Vec::new(env));
    renewal_history.push_back(renewal_record.clone());
    env.storage().instance().set(
        &CredentialRegistryKey::RenewalHistory(credential_id),
        &renewal_history,
    );

    // Update credential
    credential.expires_at = current_time + extension_duration;
    credential.status = CredentialStatus::Active;
    credential.renewal_count += 1;
    credential.last_renewed_at = Some(current_time);

    env.storage().persistent().set(
        &CredentialRegistryKey::Credential(credential_id),
        &credential,
    );

    // Emit renewal event
    env.events().publish(
        (Symbol::new(env, "credential"), Symbol::new(env, "renewed")),
        (credential_id, renewer, extension_duration),
    );

    true
}

/// Check and update credential expiration status
pub fn check_credential_expiration(env: &Env, credential_id: u64) -> CredentialStatus {
    let mut credential: CredentialRegistry = env
        .storage()
        .persistent()
        .get(&CredentialRegistryKey::Credential(credential_id))
        .unwrap_or_else(|| panic!("Credential not found"));

    let current_time = env.ledger().timestamp();

    // Skip if already revoked
    if credential.status == CredentialStatus::Revoked {
        return credential.status;
    }

    // Check if credential has expired
    if current_time >= credential.expires_at && credential.status == CredentialStatus::Active {
        credential.status = CredentialStatus::Expired;

        // Update stored credential
        env.storage().persistent().set(
            &CredentialRegistryKey::Credential(credential_id),
            &credential,
        );

        // Add to expired credentials list
        let mut expired_creds = env
            .storage()
            .instance()
            .get(&CredentialRegistryKey::ExpiredCredentials)
            .unwrap_or_else(|| Vec::new(env));
        expired_creds.push_back(credential_id);
        env.storage()
            .instance()
            .set(&CredentialRegistryKey::ExpiredCredentials, &expired_creds);

        // Emit expiration event
        env.events().publish(
            (Symbol::new(env, "credential"), Symbol::new(env, "expired")),
            (credential_id, current_time),
        );
    }

    credential.status
}

/// Batch update expiration status for multiple credentials
pub fn batch_update_expiration_status(env: &Env, credential_ids: Vec<u64>) -> Vec<u64> {
    let mut expired_credentials = Vec::new(env);

    for credential_id in credential_ids.iter() {
        let status = check_credential_expiration(env, *credential_id);
        if status == CredentialStatus::Expired {
            expired_credentials.push_back(*credential_id);
        }
    }

    expired_credentials
}

/// Get credential with current status
pub fn get_credential(env: &Env, credential_id: u64) -> CredentialRegistry {
    // Check expiration status before returning
    check_credential_expiration(env, credential_id);

    env.storage()
        .persistent()
        .get(&CredentialRegistryKey::Credential(credential_id))
        .unwrap_or_else(|| panic!("Credential not found"))
}

/// Get user credentials with current status
pub fn get_user_credentials(env: &Env, user: Address) -> Vec<u64> {
    env.storage()
        .persistent()
        .get(&CredentialRegistryKey::UserCredentials(user))
        .unwrap_or_else(|| Vec::new(env))
}

/// Get expired credentials list
pub fn get_expired_credentials(env: &Env) -> Vec<u64> {
    env.storage()
        .instance()
        .get(&CredentialRegistryKey::ExpiredCredentials)
        .unwrap_or_else(|| Vec::new(env))
}

/// Get renewal history for a credential
pub fn get_renewal_history(env: &Env, credential_id: u64) -> Vec<RenewalRecord> {
    env.storage()
        .instance()
        .get(&CredentialRegistryKey::RenewalHistory(credential_id))
        .unwrap_or_else(|| Vec::new(env))
}

/// Revoke a credential
pub fn revoke_credential(env: &Env, credential_id: u64, revoker: Address) -> bool {
    revoker.require_auth();

    let admin: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(env, "admin"))
        .unwrap_or_else(|| panic!("Admin not found"));

    if revoker != admin {
        panic!("Only admin can revoke credentials");
    }

    let mut credential: CredentialRegistry = env
        .storage()
        .persistent()
        .get(&CredentialRegistryKey::Credential(credential_id))
        .unwrap_or_else(|| panic!("Credential not found"));

    credential.status = CredentialStatus::Revoked;
    env.storage().persistent().set(
        &CredentialRegistryKey::Credential(credential_id),
        &credential,
    );

    // Emit revocation event
    env.events().publish(
        (Symbol::new(env, "credential"), Symbol::new(env, "revoked")),
        (credential_id, revoker),
    );

    true
}

/// Get credential count
pub fn get_credential_count(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&CredentialRegistryKey::CredentialCount)
        .unwrap_or(0)
}

/// Check if a credential is currently valid
pub fn is_credential_valid(env: &Env, credential_id: u64) -> bool {
    let credential = get_credential(env, credential_id);
    matches!(credential.status, CredentialStatus::Active)
}

/// Get credentials expiring within a time window
pub fn get_credentials_expiring_soon(env: &Env, within_seconds: u64) -> Vec<u64> {
    let current_time = env.ledger().timestamp();
    let threshold = current_time + within_seconds;
    let mut expiring_soon = Vec::new(env);

    // This is a simplified implementation - in production, you'd want
    // an indexed storage structure for better performance
    let credential_count = get_credential_count(env);
    for i in 1..=credential_count {
        if let Ok(credential) = env
            .storage()
            .persistent()
            .get::<_, CredentialRegistry>(&CredentialRegistryKey::Credential(i))
        {
            if credential.expires_at <= threshold && credential.status == CredentialStatus::Active {
                expiring_soon.push_back(i);
            }
        }
    }

    expiring_soon
}

// ═══════════════════════════════════════════════════════════════════
//  Multi-Signature Credential Registry Extension
// ═══════════════════════════════════════════════════════════════════

/// Multi-signature credential registry entry
#[contracttype]
#[derive(Clone)]
pub struct MultiSigCredentialRegistry {
    pub id: u64,
    pub threshold: u32,
    pub signers: Vec<Address>,
    pub recipient: Address,
    pub title: String,
    pub description: String,
    pub course_id: String,
    pub issued_at: u64,
    pub expires_at: u64,
    pub status: CredentialStatus,
    pub ipfs_hash: String,
    pub signature_count: u32,
    pub renewal_count: u32,
    pub last_renewed_at: Option<u64>,
}

/// Multi-signature credential registry storage keys
#[contracttype]
pub enum MultiSigRegistryKey {
    MultiSigCredential(u64),
    MultiSigSignatures(u64),
    MultiSigSignerSet(u64),
    MultiSigUserCredentials(Address),
    MultiSigCredentialCount,
    MultiSigRenewalHistory(u64),
}

/// Create a multi-signature credential in the registry
pub fn create_multi_sig_credential(
    env: &Env,
    issuer: Address,
    signers: Vec<Address>,
    threshold: u32,
    recipient: Address,
    title: String,
    description: String,
    course_id: String,
    ipfs_hash: String,
    validity_duration: u64,
) -> u64 {
    issuer.require_auth();

    let admin: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(env, "admin"))
        .unwrap_or_else(|| panic!("Admin not found"));

    if issuer != admin {
        panic!("Unauthorized issuer");
    }

    let signer_count = signers.len() as u32;
    if signer_count == 0 {
        panic!("Signer list cannot be empty");
    }
    if threshold == 0 || threshold > signer_count {
        panic!("Threshold must be between 1 and the number of signers");
    }

    let credential_id = StorageUtils::get_next_id(env, EntityType::Credential);
    let current_time = env.ledger().timestamp();

    let credential = MultiSigCredentialRegistry {
        id: credential_id,
        threshold,
        signers: signers.clone(),
        recipient: recipient.clone(),
        title,
        description,
        course_id,
        issued_at: current_time,
        expires_at: current_time + validity_duration,
        status: CredentialStatus::Pending,
        ipfs_hash,
        signature_count: 0,
        renewal_count: 0,
        last_renewed_at: None,
    };

    // Store credential in persistent storage
    env.storage().persistent().set(
        &MultiSigRegistryKey::MultiSigCredential(credential_id),
        &credential,
    );

    // Initialize empty signatures
    let empty_sigs: Vec<Address> = Vec::new(env);
    env.storage().persistent().set(
        &MultiSigRegistryKey::MultiSigSignatures(credential_id),
        &empty_sigs,
    );

    // Store authorized signer set for quick lookup
    env.storage().persistent().set(
        &MultiSigRegistryKey::MultiSigSignerSet(credential_id),
        &signers,
    );

    // Add to user's multi-sig credential list
    let mut user_creds = env
        .storage()
        .persistent()
        .get(&MultiSigRegistryKey::MultiSigUserCredentials(recipient.clone()))
        .unwrap_or_else(|| Vec::new(env));
    user_creds.push_back(credential_id);
    env.storage().persistent().set(
        &MultiSigRegistryKey::MultiSigUserCredentials(recipient),
        &user_creds,
    );

    // Update credential count
    env.storage()
        .instance()
        .set(&MultiSigRegistryKey::MultiSigCredentialCount, &credential_id);

    // Emit event
    env.events().publish(
        (
            Symbol::new(env, "multi_sig_registry"),
            Symbol::new(env, "created"),
        ),
        (credential_id, threshold, signer_count),
    );

    credential_id
}

/// Add a signature to a multi-signature credential in the registry
pub fn add_multi_sig_signature(
    env: &Env,
    credential_id: u64,
    signer: Address,
) -> CredentialStatus {
    signer.require_auth();

    let mut credential: MultiSigCredentialRegistry = env
        .storage()
        .persistent()
        .get(&MultiSigRegistryKey::MultiSigCredential(credential_id))
        .unwrap_or_else(|| panic!("Multi-sig credential not found"));

    // Reject if already active or revoked
    match credential.status {
        CredentialStatus::Revoked => panic!("Credential is revoked"),
        CredentialStatus::Expired => panic!("Credential is expired"),
        CredentialStatus::Active => panic!("Credential is already active"),
        CredentialStatus::Pending => {} // OK to sign
    }

    // Verify signer is in the authorized set
    let signer_set: Vec<Address> = env
        .storage()
        .persistent()
        .get(&MultiSigRegistryKey::MultiSigSignerSet(credential_id))
        .unwrap_or_else(|| panic!("Signer set not found"));

    if !signer_set.contains(&signer) {
        panic!("Signer is not authorized for this credential");
    }

    // Load signatures and check for duplicates
    let mut signatures: Vec<Address> = env
        .storage()
        .persistent()
        .get(&MultiSigRegistryKey::MultiSigSignatures(credential_id))
        .unwrap_or_else(|| Vec::new(env));

    if signatures.contains(&signer) {
        panic!("Signer has already signed this credential");
    }

    // Add signature
    signatures.push_back(signer.clone());
    env.storage().persistent().set(
        &MultiSigRegistryKey::MultiSigSignatures(credential_id),
        &signatures,
    );

    credential.signature_count = signatures.len() as u32;

    // Emit signature event
    env.events().publish(
        (
            Symbol::new(env, "multi_sig_registry"),
            Symbol::new(env, "signed"),
        ),
        (credential_id, signer.clone()),
    );

    // Check threshold
    if credential.signature_count >= credential.threshold {
        credential.status = CredentialStatus::Active;
        env.storage().persistent().set(
            &MultiSigRegistryKey::MultiSigCredential(credential_id),
            &credential,
        );

        // Emit activation event
        env.events().publish(
            (
                Symbol::new(env, "multi_sig_registry"),
                Symbol::new(env, "activated"),
            ),
            (credential_id,),
        );

        return CredentialStatus::Active;
    }

    // Store updated credential with new signature count
    env.storage().persistent().set(
        &MultiSigRegistryKey::MultiSigCredential(credential_id),
        &credential,
    );

    CredentialStatus::Pending
}

/// Get a multi-sig credential from the registry
pub fn get_multi_sig_credential(
    env: &Env,
    credential_id: u64,
) -> MultiSigCredentialRegistry {
    env.storage()
        .persistent()
        .get(&MultiSigRegistryKey::MultiSigCredential(credential_id))
        .unwrap_or_else(|| panic!("Multi-sig credential not found"))
}

/// Get signatures for a multi-sig credential
pub fn get_multi_sig_signatures(env: &Env, credential_id: u64) -> Vec<Address> {
    env.storage()
        .persistent()
        .get(&MultiSigRegistryKey::MultiSigSignatures(credential_id))
        .unwrap_or_else(|| Vec::new(env))
}

/// Get the authorized signer set for a multi-sig credential
pub fn get_multi_sig_signer_set(env: &Env, credential_id: u64) -> Vec<Address> {
    env.storage()
        .persistent()
        .get(&MultiSigRegistryKey::MultiSigSignerSet(credential_id))
        .unwrap_or_else(|| Vec::new(env))
}

/// Check if credential threshold has been met
pub fn is_multi_sig_active(env: &Env, credential_id: u64) -> bool {
    let credential: MultiSigCredentialRegistry = env
        .storage()
        .persistent()
        .get(&MultiSigRegistryKey::MultiSigCredential(credential_id))
        .unwrap_or_else(|| panic!("Multi-sig credential not found"));

    credential.status == CredentialStatus::Active
}

/// Get multi-sig credential count
pub fn get_multi_sig_credential_count(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&MultiSigRegistryKey::MultiSigCredentialCount)
        .unwrap_or(0)
}

/// Revoke a multi-sig credential
pub fn revoke_multi_sig_credential(env: &Env, credential_id: u64, revoker: Address) -> bool {
    revoker.require_auth();

    let admin: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(env, "admin"))
        .unwrap_or_else(|| panic!("Admin not found"));

    if revoker != admin {
        panic!("Only admin can revoke credentials");
    }

    let mut credential: MultiSigCredentialRegistry = env
        .storage()
        .persistent()
        .get(&MultiSigRegistryKey::MultiSigCredential(credential_id))
        .unwrap_or_else(|| panic!("Multi-sig credential not found"));

    credential.status = CredentialStatus::Revoked;
    env.storage().persistent().set(
        &MultiSigRegistryKey::MultiSigCredential(credential_id),
        &credential,
    );

    env.events().publish(
        (
            Symbol::new(env, "multi_sig_registry"),
            Symbol::new(env, "revoked"),
        ),
        (credential_id, revoker),
    );

    true
}
