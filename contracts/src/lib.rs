#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

pub mod governance;
#[cfg(test)]
pub mod governance_test;
pub mod tokenomics;
#[cfg(test)]
pub mod tokenomics_test;
pub mod user_profile;
#[cfg(test)]
pub mod user_profile_test;
pub mod utils;

/// Core storage keys
#[contracttype]
pub enum DataKey {
    Admin,
    Credential(u64),
    CredentialCount,
    CourseCount,
    Course(u64),
    AchievementCount,
}

/// Credential with issuer/recipient data
#[contracttype]
#[derive(Clone)]
pub struct Credential {
    pub id: u64,
    pub issuer: Address,
    pub recipient: Address,
    pub title: String,
    pub course_id: String,
    pub ipfs_hash: String,
    pub timestamp: u64,
}

/// Course data
#[contracttype]
#[derive(Clone)]
pub struct Course {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub price: u64,
}

/// User profile summary
#[contracttype]
#[derive(Clone)]
pub struct Profile {
    pub owner: Address,
    pub credential_count: u32,
    pub achievement_count: u32,
    pub reputation: u64,
}

#[contract]
pub struct StarkEdContract;

#[contractimpl]
impl StarkEdContract {
    /// Initialize the contract
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::CredentialCount, &0u64);
        env.storage().instance().set(&DataKey::CourseCount, &0u64);
        env.storage()
            .instance()
            .set(&DataKey::AchievementCount, &0u64);
    }

    /// Issue a new credential
    pub fn issue_credential(
        env: Env,
        issuer: Address,
        recipient: Address,
        title: String,
        course_id: String,
        ipfs_hash: String,
    ) -> u64 {
        issuer.require_auth();
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Not initialized"));
        if issuer != admin {
            panic!("Only admin can issue credentials");
        }
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::CredentialCount)
            .unwrap_or(0);
        let credential_id = count + 1;
        let credential = Credential {
            id: credential_id,
            issuer: issuer.clone(),
            recipient: recipient.clone(),
            title,
            course_id,
            ipfs_hash,
            timestamp: env.ledger().timestamp(),
        };
        env.storage()
            .instance()
            .set(&DataKey::Credential(credential_id), &credential);
        env.storage()
            .instance()
            .set(&DataKey::CredentialCount, &credential_id);
        credential_id
    }

    /// Get credential by ID
    pub fn get_credential(env: Env, credential_id: u64) -> Credential {
        env.storage()
            .instance()
            .get(&DataKey::Credential(credential_id))
            .unwrap_or_else(|| panic!("Credential not found"))
    }

    /// Verify a credential (exists check)
    pub fn verify_credential(env: Env, credential_id: u64) -> bool {
        env.storage()
            .instance()
            .has(&DataKey::Credential(credential_id))
    }

    /// Create a course
    pub fn create_course(
        env: Env,
        instructor: Address,
        title: String,
        description: String,
        price: u64,
    ) -> u64 {
        instructor.require_auth();
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Not initialized"));
        if instructor != admin {
            panic!("Only admin can create courses");
        }
        let course_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::CourseCount)
            .unwrap_or(0);
        let course_id = course_count + 1;
        let course = Course {
            id: course_id,
            title,
            description,
            price,
        };
        env.storage()
            .instance()
            .set(&DataKey::Course(course_id), &course);
        env.storage()
            .instance()
            .set(&DataKey::CourseCount, &course_id);
        course_id
    }

    /// Get course by ID
    pub fn get_course(env: Env, course_id: u64) -> Course {
        env.storage()
            .instance()
            .get(&DataKey::Course(course_id))
            .unwrap_or_else(|| panic!("Course not found"))
    }

    /// Get credential count
    pub fn get_credential_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::CredentialCount)
            .unwrap_or(0)
    }

    /// Get course count
    pub fn get_course_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::CourseCount)
            .unwrap_or(0)
    }

    /// Get admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Not initialized"))
    }
}
