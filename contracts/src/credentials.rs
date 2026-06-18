use crate::utils::storage::{EntityType, StorageUtils};
use soroban_sdk::{contracttype, Address, Env, String, Symbol, Vec};

/// Optimized credential keys with better organization
#[contracttype]
pub enum CredentialKey {
    Credential(u64),
    UserCredentials(Address),
    CredentialCount,
    CredentialMetadata(u64),    // Separate metadata storage
    CredentialRevocations(u64), // Separate revocation tracking
}

/// Optimized credential with packed verification status
#[contracttype]
pub struct Credential {
    pub id: u64,
    pub issuer: Address,
    pub recipient: Address,
    pub title: String,
    pub description_hash: String, // Hash of description string
    pub course_id: String,
    pub timestamp: u64, // Packed completion_date and revocation status
    pub ipfs_hash: String,
}

/// Issue a new credential with optimized storage
pub fn issue_credential(
    env: &Env,
    issuer: Address,
    recipient: Address,
    title: String,
    description: String,
    course_id: String,
    ipfs_hash: String,
) -> u64 {
    issuer.require_auth();

    let admin: Address = env.storage().instance().get(&Symbol::new(env, "admin"));
    if issuer != admin {
        panic!("Unauthorized issuer");
    }

    // Use shared storage utility for ID generation
    let credential_id = StorageUtils::get_next_id(env, EntityType::Credential);

    // Pack timestamp and revocation status
    let timestamp = env.ledger().timestamp();
    let packed_timestamp = timestamp << 1; // Reserve bit 0 for revocation status

    // Generate hash for description to save storage space
    let description_hash = generate_string_hash(&description);

    let credential = Credential {
        id: credential_id,
        issuer: issuer.clone(),
        recipient: recipient.clone(),
        title,
        description_hash,
        course_id,
        timestamp: packed_timestamp,
        ipfs_hash,
    };

    // Store credential in persistent storage
    env.storage()
        .persistent()
        .set(&CredentialKey::Credential(credential_id), &credential);

    // Store description separately if needed for verification
    env.storage().instance().set(
        &CredentialKey::CredentialMetadata(credential_id),
        &description,
    );

    // Integrate with user profile
    user_profile::add_credential(env, recipient.clone(), credential_id);

    // Update credential count
    env.storage()
        .instance()
        .set(&CredentialKey::CredentialCount, &credential_id);

    credential_id
}

/// Verify a credential using packed timestamp
pub fn verify_credential(env: &Env, credential_id: u64) -> bool {
    let mut credential: Credential = env
        .storage()
        .persistent()
        .get(&CredentialKey::Credential(credential_id))
        .unwrap_or_else(|| panic!("Credential not found"));

    // Check revocation bit (bit 0)
    if (credential.timestamp & 1) != 0 {
        return false; // Credential is revoked
    }

    // Here you can add more verification logic (e.g. check issuer signature, expiration)
    true
}

/// Revoke a credential using packed timestamp
pub fn revoke_credential(env: &Env, credential_id: u64, revoker: Address) {
    revoker.require_auth();

    let admin: Address = env.storage().instance().get(&Symbol::new(env, "admin"));
    if revoker != admin {
        panic!("Only admin can revoke");
    }

    let mut credential: Credential = env
        .storage()
        .persistent()
        .get(&CredentialKey::Credential(credential_id))
        .unwrap_or_else(|| panic!("Credential not found"));

    // Set revocation bit (bit 0)
    credential.timestamp |= 1u64;
    env.storage()
        .persistent()
        .set(&CredentialKey::Credential(credential_id), &credential);

    // Store revocation record
    let revocation_time = env.ledger().timestamp();
    env.storage().instance().set(
        &CredentialKey::CredentialRevocations(credential_id),
        &revocation_time,
    );
}

/// Get user credentials with optimized storage
pub fn get_user_credentials(env: &Env, user: Address) -> Vec<u64> {
    env.storage()
        .persistent()
        .get(&CredentialKey::UserCredentials(user))
        .unwrap_or_else(|| Vec::new(env))
}

/// Get credential details with optional description
pub fn get_credential(env: &Env, credential_id: u64) -> Credential {
    env.storage()
        .persistent()
        .get(&CredentialKey::Credential(credential_id))
        .unwrap_or_else(|| panic!("Credential not found"))
}

/// Get credential description if needed
pub fn get_credential_description(env: &Env, credential_id: u64) -> Option<String> {
    env.storage()
        .instance()
        .get(&CredentialKey::CredentialMetadata(credential_id))
}

/// Get credential revocation time
pub fn get_credential_revocation_time(env: &Env, credential_id: u64) -> Option<u64> {
    env.storage()
        .instance()
        .get(&CredentialKey::CredentialRevocations(credential_id))
}

/// Get credential count with optimized storage
pub fn get_credential_count(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&CredentialKey::CredentialCount)
        .unwrap_or(0)
}

// ═══════════════════════════════════════════════════════════════════
//  Multi-Signature Credential Issuance (M-of-N)
// ═══════════════════════════════════════════════════════════════════

/// Multi-signature credential for high-stakes credentials (degrees, certifications)
#[contracttype]
pub struct MultiSigCredential {
    pub id: u64,
    pub threshold: u32,
    pub signers: Vec<Address>,
    pub recipient: Address,
    pub title: String,
    pub description_hash: String,
    pub course_id: String,
    pub ipfs_hash: String,
    pub timestamp: u64,
    pub activated: bool,
}

/// Multi-sig storage keys
#[contracttype]
pub enum MultiSigCredentialKey {
    MultiSigCred(u64),
    MultiSigSignatures(u64),
    MultiSigCredCount,
}

/// Events emitted during multi-sig credential lifecycle
#[contracttype]
pub enum MultiSigEvent {
    CredentialCreated(u64, u32, u32),
    SignatureAdded(u64, Address),
    CredentialActivated(u64),
}

/// Create a new multi-signature credential (M-of-N)
///
/// Only the admin can create multi-sig credentials.
/// The credential starts inactive and requires `threshold` valid
/// signatures from the `signers` set before it becomes active.
pub fn create_multi_sig_credential(
    env: &Env,
    creator: Address,
    signers: Vec<Address>,
    threshold: u32,
    recipient: Address,
    title: String,
    description: String,
    course_id: String,
    ipfs_hash: String,
) -> u64 {
    creator.require_auth();

    let admin: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(env, "admin"))
        .unwrap_or_else(|| panic!("Admin not set"));

    if creator != admin {
        panic!("Only admin can create multi-sig credentials");
    }

    let signer_count = signers.len() as u32;
    if signer_count == 0 {
        panic!("Signer list cannot be empty");
    }
    if threshold == 0 || threshold > signer_count {
        panic!("Threshold must be between 1 and the number of signers");
    }

    let credential_id = StorageUtils::get_next_id(env, EntityType::Credential);
    let description_hash = generate_string_hash(&description);
    let timestamp = env.ledger().timestamp();

    let credential = MultiSigCredential {
        id: credential_id,
        threshold,
        signers: signers.clone(),
        recipient: recipient.clone(),
        title,
        description_hash,
        course_id,
        ipfs_hash,
        timestamp,
        activated: false,
    };

    // Store credential
    env.storage()
        .persistent()
        .set(&MultiSigCredentialKey::MultiSigCred(credential_id), &credential);

    // Store description separately for later retrieval
    env.storage()
        .instance()
        .set(&CredentialKey::CredentialMetadata(credential_id), &description);

    // Initialize empty signature set
    let empty_sigs: Vec<Address> = Vec::new(env);
    env.storage().persistent().set(
        &MultiSigCredentialKey::MultiSigSignatures(credential_id),
        &empty_sigs,
    );

    // Update credential count
    env.storage()
        .instance()
        .set(&MultiSigCredentialKey::MultiSigCredCount, &credential_id);

    // Also link to recipient's profile
    user_profile::add_credential(env, recipient.clone(), credential_id);

    // Emit creation event
    env.events().publish(
        (
            Symbol::new(env, "multi_sig_cred"),
            Symbol::new(env, "created"),
        ),
        (credential_id, threshold, signer_count),
    );

    credential_id
}

/// Add a signature to a multi-signature credential
///
/// The caller must be one of the authorized signers.
/// Duplicate signatures from the same signer are rejected.
/// When the threshold is reached, the credential is automatically activated.
pub fn add_multi_sig_signature(
    env: &Env,
    credential_id: u64,
    signer: Address,
) -> bool {
    signer.require_auth();

    let mut credential: MultiSigCredential = env
        .storage()
        .persistent()
        .get(&MultiSigCredentialKey::MultiSigCred(credential_id))
        .unwrap_or_else(|| panic!("Multi-sig credential not found"));

    // Reject if already activated
    if credential.activated {
        panic!("Credential is already activated");
    }

    // Verify signer is authorized
    if !is_authorized_signer(&credential.signers, &signer) {
        panic!("Signer is not authorized for this credential");
    }

    // Load current signatures and check for duplicates
    let mut signatures: Vec<Address> = env
        .storage()
        .persistent()
        .get(&MultiSigCredentialKey::MultiSigSignatures(credential_id))
        .unwrap_or_else(|| Vec::new(env));

    if signatures.contains(&signer) {
        panic!("Signer has already signed this credential");
    }

    // Add the signature
    signatures.push_back(signer.clone());
    env.storage().persistent().set(
        &MultiSigCredentialKey::MultiSigSignatures(credential_id),
        &signatures,
    );

    // Emit signature event
    env.events().publish(
        (
            Symbol::new(env, "multi_sig_cred"),
            Symbol::new(env, "signed"),
        ),
        (credential_id, signer.clone()),
    );

    // Check if threshold is now met
    let current_count = signatures.len() as u32;
    if current_count >= credential.threshold {
        credential.activated = true;
        env.storage()
            .persistent()
            .set(
                &MultiSigCredentialKey::MultiSigCred(credential_id),
                &credential,
            );

        // Emit activation event
        env.events().publish(
            (
                Symbol::new(env, "multi_sig_cred"),
                Symbol::new(env, "activated"),
            ),
            (credential_id,),
        );

        return true; // Threshold met, credential activated
    }

    false // Threshold not yet met
}

/// Check if an address is in the authorized signers list
fn is_authorized_signer(signers: &Vec<Address>, signer: &Address) -> bool {
    signers.contains(signer)
}

/// Get the multi-sig credential details
pub fn get_multi_sig_credential(env: &Env, credential_id: u64) -> MultiSigCredential {
    env.storage()
        .persistent()
        .get(&MultiSigCredentialKey::MultiSigCred(credential_id))
        .unwrap_or_else(|| panic!("Multi-sig credential not found"))
}

/// Get the list of signers who have signed a multi-sig credential
pub fn get_multi_sig_signatures(env: &Env, credential_id: u64) -> Vec<Address> {
    env.storage()
        .persistent()
        .get(&MultiSigCredentialKey::MultiSigSignatures(credential_id))
        .unwrap_or_else(|| Vec::new(env))
}

/// Check if the threshold for a multi-sig credential has been met
pub fn is_multi_sig_threshold_met(env: &Env, credential_id: u64) -> bool {
    let credential: MultiSigCredential = env
        .storage()
        .persistent()
        .get(&MultiSigCredentialKey::MultiSigCred(credential_id))
        .unwrap_or_else(|| panic!("Multi-sig credential not found"));

    credential.activated
}

/// Query the status of a multi-sig credential
/// Returns a tuple of (activated, signature_count, threshold)
pub fn get_multi_sig_status(env: &Env, credential_id: u64) -> (bool, u32, u32) {
    let credential: MultiSigCredential = env
        .storage()
        .persistent()
        .get(&MultiSigCredentialKey::MultiSigCred(credential_id))
        .unwrap_or_else(|| panic!("Multi-sig credential not found"));

    let signatures: Vec<Address> = env
        .storage()
        .persistent()
        .get(&MultiSigCredentialKey::MultiSigSignatures(credential_id))
        .unwrap_or_else(|| Vec::new(env));

    (
        credential.activated,
        signatures.len() as u32,
        credential.threshold,
    )
}

/// Generate hash for string data
fn generate_string_hash(string: &String) -> String {
    let mut hash = 0u64;
    for byte in string.clone().into_bytes() {
        hash = hash.wrapping_mul(31).wrapping_add(byte as u64);
    }
    format!("{:x}", hash)
}
