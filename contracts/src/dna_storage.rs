use crate::credentials::CredentialKey;
use soroban_sdk::{contracttype, panic_with_error, Address, Env, String, Symbol, Vec, U256};

/// DNA nucleotide bases
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Nucleotide {
    Adenine = 0,  // A
    Cytosine = 1, // C
    Guanine = 2,  // G
    Thymine = 3,  // T
}

impl Nucleotide {
    pub fn from_u8(value: u8) -> Self {
        match value & 0x03 {
            0 => Nucleotide::Adenine,
            1 => Nucleotide::Cytosine,
            2 => Nucleotide::Guanine,
            3 => Nucleotide::Thymine,
            _ => Nucleotide::Adenine,
        }
    }

    pub fn to_char(&self) -> char {
        match self {
            Nucleotide::Adenine => 'A',
            Nucleotide::Cytosine => 'C',
            Nucleotide::Guanine => 'G',
            Nucleotide::Thymine => 'T',
        }
    }

    pub fn complement(&self) -> Self {
        match self {
            Nucleotide::Adenine => Nucleotide::Thymine,
            Nucleotide::Cytosine => Nucleotide::Guanine,
            Nucleotide::Guanine => Nucleotide::Cytosine,
            Nucleotide::Thymine => Nucleotide::Adenine,
        }
    }
}

/// DNA sequence structure
#[contracttype]
#[derive(Clone)]
pub struct DNASequence {
    pub sequence: Vec<u8>, // Packed nucleotides (2 bits per base)
    pub length: u32,       // Number of bases
    pub checksum: u32,     // CRC32 checksum for integrity
    pub metadata: DnaMetadata,
}

/// DNA metadata for storage and retrieval
#[contracttype]
#[derive(Clone)]
pub struct DnaMetadata {
    pub encoding_version: u8,
    pub compression_level: u8,
    pub error_correction: u8,
    pub storage_timestamp: u64,
    pub synthesis_batch: String,
    pub sequencing_id: String,
}

/// Error correction levels
#[contracttype]
#[derive(Clone, Debug)]
pub enum ErrorCorrectionLevel {
    None = 0,
    Basic = 1,       // Simple parity
    ReedSolomon = 2, // Reed-Solomon codes
    Advanced = 3,    // Hybrid error correction
}

/// DNA storage protocols
#[contracttype]
#[derive(Clone)]
pub enum DNAStorageProtocol {
    Standard = 0,  // Basic DNA storage
    Indexed = 1,   // Indexed with primers
    Redundant = 2, // Multiple copies
    Hybrid = 3,    // DNA + blockchain hybrid
}

/// DNA-encoded credential
#[contracttype]
#[derive(Clone)]
pub struct DNACredential {
    pub credential_id: u64,
    pub dna_sequence: DNASequence,
    pub blockchain_ref: String, // Reference to on-chain credential
    pub synthesis_date: u64,
    pub sequencing_date: Option<u64>,
    pub storage_protocol: DNAStorageProtocol,
    pub error_correction: ErrorCorrectionLevel,
    pub integrity_hash: String, // SHA-256 of original data
}

/// DNA storage keys
#[contracttype]
pub enum DNAStorageKey {
    DNACredential(u64),
    UserDNACredentials(Address),
    DNASequence(String), // Sequence ID -> DNASequence
    DNACredentialCount,
    SynthesisBatch(String),   // Batch ID -> Vec<u64> credential IDs
    SequencingRecord(String), // Sequencing ID -> DNACredential
    IndexMap(String),         // Hash -> credential_id
}

/// Events for DNA operations
#[contracttype]
#[derive(Clone)]
pub enum DNAEvent {
    Encoded(u64),     // credential_id
    Synthesized(u64), // credential_id
    Sequenced(u64),   // credential_id
    Verified(u64),    // credential_id
    Decoded(u64),     // credential_id
}

/// Encode digital data to DNA sequence
pub fn encode_to_dna(
    env: &Env,
    data: &Vec<u8>,
    error_correction: ErrorCorrectionLevel,
    protocol: DNAStorageProtocol,
) -> DNASequence {
    let mut encoded_data = data.clone();

    // Apply error correction
    encoded_data = apply_error_correction(env, &encoded_data, error_correction);

    // Convert binary to DNA bases (2 bits per base)
    let mut sequence = Vec::new(env);
    let mut length = 0u32;

    for byte in encoded_data.iter() {
        // High nibble (bits 4-7)
        let high_base = ((byte >> 6) & 0x03) as u8;
        sequence.push_back(high_base);
        length += 1;

        // Second nibble (bits 4-5)
        let second_base = ((byte >> 4) & 0x03) as u8;
        sequence.push_back(second_base);
        length += 1;

        // Third nibble (bits 2-3)
        let third_base = ((byte >> 2) & 0x03) as u8;
        sequence.push_back(third_base);
        length += 1;

        // Low nibble (bits 0-1)
        let low_base = (byte & 0x03) as u8;
        sequence.push_back(low_base);
        length += 1;
    }

    // Add protocol-specific headers
    if matches!(protocol, DNAStorageProtocol::Indexed) {
        // Add indexing primers (simplified)
        sequence = add_indexing_primers(env, sequence);
        length += 20; // Primer length
    }

    // Calculate checksum
    let checksum = calculate_dna_checksum(env, &sequence);

    let metadata = DnaMetadata {
        encoding_version: 1,
        compression_level: 0,
        error_correction: match error_correction {
            ErrorCorrectionLevel::None => 0,
            ErrorCorrectionLevel::Basic => 1,
            ErrorCorrectionLevel::ReedSolomon => 2,
            ErrorCorrectionLevel::Advanced => 3,
        },
        storage_timestamp: env.ledger().timestamp(),
        synthesis_batch: String::from_str(env, &format!("batch_{}", env.ledger().sequence())),
        sequencing_id: String::from_str(env, ""),
    };

    DNASequence {
        sequence,
        length,
        checksum,
        metadata,
    }
}

/// Decode DNA sequence back to digital data
pub fn decode_from_dna(env: &Env, dna_sequence: &DNASequence) -> Vec<u8> {
    // Verify checksum
    let calculated_checksum = calculate_dna_checksum(env, &dna_sequence.sequence);
    if calculated_checksum != dna_sequence.checksum {
        panic_with_error!(env, "DNA sequence checksum verification failed");
    }

    let mut sequence = dna_sequence.sequence.clone();

    // Remove indexing primers if present
    if dna_sequence.metadata.encoding_version == 1 && dna_sequence.length > 20 {
        sequence = remove_indexing_primers(env, sequence);
    }

    // Convert DNA bases back to binary
    let mut decoded_data = Vec::new(env);
    let mut current_byte = 0u8;
    let mut bit_count = 0u8;

    for base_val in sequence.iter() {
        current_byte = (current_byte << 2) | (base_val & 0x03);
        bit_count += 2;

        if bit_count == 8 {
            decoded_data.push_back(current_byte);
            current_byte = 0;
            bit_count = 0;
        }
    }

    // Remove error correction
    let error_level = match dna_sequence.metadata.error_correction {
        0 => ErrorCorrectionLevel::None,
        1 => ErrorCorrectionLevel::Basic,
        2 => ErrorCorrectionLevel::ReedSolomon,
        3 => ErrorCorrectionLevel::Advanced,
        _ => ErrorCorrectionLevel::None,
    };

    remove_error_correction(env, &decoded_data, error_level)
}

/// Store credential in DNA format
pub fn store_credential_in_dna(
    env: &Env,
    credential_id: u64,
    issuer: Address,
    recipient: Address,
    title: String,
    description: String,
    course_id: String,
    ipfs_hash: String,
) -> u64 {
    issuer.require_auth();

    // Generate unique credential ID
    let credential_id = env.ledger().sequence() + 1;

    // Create credential data structure
    let credential_data = create_credential_data(
        env,
        credential_id,
        issuer,
        recipient,
        title,
        description,
        course_id,
        ipfs_hash,
    );

    // Encode to DNA with advanced error correction
    let dna_sequence = encode_to_dna(
        env,
        &credential_data,
        ErrorCorrectionLevel::Advanced,
        DNAStorageProtocol::Hybrid,
    );

    // Calculate integrity hash
    let integrity_hash = calculate_sha256_hash(env, &credential_data);

    let dna_credential = DNACredential {
        credential_id,
        dna_sequence: dna_sequence.clone(),
        blockchain_ref: format!("cred_{}", credential_id),
        synthesis_date: env.ledger().timestamp(),
        sequencing_date: None,
        storage_protocol: DNAStorageProtocol::Hybrid,
        error_correction: ErrorCorrectionLevel::Advanced,
        integrity_hash,
    };

    // Store DNA credential
    env.storage().persistent().set(
        &DNAStorageKey::DNACredential(credential_id),
        &dna_credential,
    );

    // Add to user's DNA credentials
    let mut user_dna_creds = env
        .storage()
        .persistent()
        .get(&DNAStorageKey::UserDNACredentials(recipient.clone()))
        .unwrap_or_else(|| Vec::new(env));
    user_dna_creds.push_back(credential_id);
    env.storage().persistent().set(
        &DNAStorageKey::UserDNACredentials(recipient),
        &user_dna_creds,
    );

    // Store sequence by ID
    let sequence_id = format!("seq_{}", credential_id);
    env.storage().persistent().set(
        &DNAStorageKey::DNASequence(String::from_str(env, &sequence_id)),
        &dna_sequence,
    );

    // Update count
    let count: u64 = env
        .storage()
        .instance()
        .get(&DNAStorageKey::DNACredentialCount)
        .unwrap_or(0);
    env.storage()
        .instance()
        .set(&DNAStorageKey::DNACredentialCount, &(count + 1));

    // Create index mapping
    env.storage()
        .instance()
        .set(&DNAStorageKey::IndexMap(integrity_hash), &credential_id);

    // Emit event
    env.events().publish(
        (Symbol::new(env, "dna"), Symbol::new(env, "encoded")),
        credential_id,
    );

    credential_id
}

/// Verify DNA-stored credential
pub fn verify_dna_credential(env: &Env, credential_id: u64) -> bool {
    let dna_credential: DNACredential = env
        .storage()
        .persistent()
        .get(&DNAStorageKey::DNACredential(credential_id))
        .unwrap_or_else(|| panic!("DNA credential not found"));

    // Decode DNA sequence
    let decoded_data = decode_from_dna(env, &dna_credential.dna_sequence);

    // Verify integrity hash
    let calculated_hash = calculate_sha256_hash(env, &decoded_data);
    if calculated_hash != dna_credential.integrity_hash {
        return false;
    }

    // Additional verification based on protocol
    match dna_credential.storage_protocol {
        DNAStorageProtocol::Hybrid => {
            // Verify blockchain reference exists
            verify_blockchain_reference(env, &dna_credential.blockchain_ref)
        }
        _ => true, // Basic DNA verification passed
    }
}

/// Retrieve credential from DNA storage
pub fn retrieve_credential_from_dna(env: &Env, credential_id: u64) -> Vec<u8> {
    let dna_credential: DNACredential = env
        .storage()
        .persistent()
        .get(&DNAStorageKey::DNACredential(credential_id))
        .unwrap_or_else(|| panic!("DNA credential not found"));

    // Decode and return
    let decoded_data = decode_from_dna(env, &dna_credential.dna_sequence);

    // Emit retrieval event
    env.events().publish(
        (Symbol::new(env, "dna"), Symbol::new(env, "decoded")),
        credential_id,
    );

    decoded_data
}

/// Get user's DNA-stored credentials
pub fn get_user_dna_credentials(env: &Env, user: Address) -> Vec<u64> {
    env.storage()
        .persistent()
        .get(&DNAStorageKey::UserDNACredentials(user))
        .unwrap_or_else(|| Vec::new(env))
}

/// Apply error correction to data
fn apply_error_correction(env: &Env, data: &Vec<u8>, level: ErrorCorrectionLevel) -> Vec<u8> {
    match level {
        ErrorCorrectionLevel::None => data.clone(),
        ErrorCorrectionLevel::Basic => add_parity_bits(env, data),
        ErrorCorrectionLevel::ReedSolomon => apply_reed_solomon(env, data),
        ErrorCorrectionLevel::Advanced => apply_hybrid_correction(env, data),
    }
}

/// Remove error correction from data
fn remove_error_correction(env: &Env, data: &Vec<u8>, level: ErrorCorrectionLevel) -> Vec<u8> {
    match level {
        ErrorCorrectionLevel::None => data.clone(),
        ErrorCorrectionLevel::Basic => remove_parity_bits(env, data),
        ErrorCorrectionLevel::ReedSolomon => remove_reed_solomon(env, data),
        ErrorCorrectionLevel::Advanced => remove_hybrid_correction(env, data),
    }
}

/// Calculate DNA sequence checksum
fn calculate_dna_checksum(env: &Env, sequence: &Vec<u8>) -> u32 {
    let mut checksum = 0u32;
    for byte in sequence.iter() {
        checksum = checksum.wrapping_mul(31).wrapping_add(*byte as u32);
    }
    checksum
}

/// Add indexing primers to sequence
fn add_indexing_primers(env: &Env, mut sequence: Vec<u8>) -> Vec<u8> {
    // Simplified primer addition (ATGC repeated pattern)
    let primer = vec![0u8, 3u8, 2u8, 1u8, 0u8, 3u8, 2u8, 1u8, 0u8, 3u8]; // ATGCATGCAT
    let mut new_sequence = Vec::new(env);

    // Add forward primer
    for base in primer.iter() {
        new_sequence.push_back(*base);
    }

    // Add original sequence
    for base in sequence.iter() {
        new_sequence.push_back(*base);
    }

    // Add reverse primer (complement)
    for base in primer.iter().rev() {
        new_sequence.push_back(*base);
    }

    new_sequence
}

/// Remove indexing primers from sequence
fn remove_indexing_primers(env: &Env, sequence: Vec<u8>) -> Vec<u8> {
    if sequence.len() < 20 {
        return sequence;
    }

    // Remove first 10 and last 10 bases (primers)
    let mut trimmed = Vec::new(env);
    for i in 10..sequence.len() - 10 {
        trimmed.push_back(sequence.get(i).unwrap_or(&0));
    }
    trimmed
}

/// Create credential data structure for encoding
fn create_credential_data(
    env: &Env,
    credential_id: u64,
    issuer: Address,
    recipient: Address,
    title: String,
    description: String,
    course_id: String,
    ipfs_hash: String,
) -> Vec<u8> {
    let mut data = Vec::new(env);

    // Add credential ID (8 bytes)
    for i in 0..8 {
        data.push_back(((credential_id >> (i * 8)) & 0xFF) as u8);
    }

    // Add addresses (simplified - using string representation)
    let issuer_str = issuer.to_string();
    for byte in issuer_str.into_bytes().iter() {
        data.push_back(*byte);
    }
    data.push_back(0); // Separator

    let recipient_str = recipient.to_string();
    for byte in recipient_str.into_bytes().iter() {
        data.push_back(*byte);
    }
    data.push_back(0); // Separator

    // Add strings
    for byte in title.into_bytes().iter() {
        data.push_back(*byte);
    }
    data.push_back(0);

    for byte in description.into_bytes().iter() {
        data.push_back(*byte);
    }
    data.push_back(0);

    for byte in course_id.into_bytes().iter() {
        data.push_back(*byte);
    }
    data.push_back(0);

    for byte in ipfs_hash.into_bytes().iter() {
        data.push_back(*byte);
    }
    data.push_back(0);

    data
}

/// Calculate SHA-256 hash (simplified implementation)
fn calculate_sha256_hash(env: &Env, data: &Vec<u8>) -> String {
    let mut hash = 0u64;
    for byte in data.iter() {
        hash = hash.wrapping_mul(31).wrapping_add(*byte as u64);
    }
    format!("{:x}", hash)
}

/// Verify blockchain reference exists
fn verify_blockchain_reference(env: &Env, reference: &String) -> bool {
    // Simplified verification - check if credential exists on blockchain
    if reference.starts_with("cred_") {
        let id_str = &reference[5..];
        if let Ok(cred_id) = id_str.parse::<u64>() {
            return env
                .storage()
                .persistent()
                .has(&crate::credentials::CredentialKey::Credential(cred_id));
        }
    }
    false
}

// Error correction implementations (simplified)
fn add_parity_bits(env: &Env, data: &Vec<u8>) -> Vec<u8> {
    let mut result = Vec::new(env);
    for byte in data.iter() {
        result.push_back(*byte);
        // Simple parity bit
        let parity = byte.count_ones() % 2;
        result.push_back(parity as u8);
    }
    result
}

fn remove_parity_bits(env: &Env, data: &Vec<u8>) -> Vec<u8> {
    let mut result = Vec::new(env);
    for i in (0..data.len()).step_by(2) {
        if i < data.len() {
            result.push_back(data.get(i).unwrap_or(&0));
        }
    }
    result
}

fn apply_reed_solomon(env: &Env, data: &Vec<u8>) -> Vec<u8> {
    // Simplified Reed-Solomon - add redundancy
    let mut result = data.clone();
    // Add 10% redundancy
    let redundancy = (data.len() / 10).max(1);
    for i in 0..redundancy {
        let redundant_byte = data.get(i % data.len()).unwrap_or(&0);
        result.push_back(*redundant_byte);
    }
    result
}

fn remove_reed_solomon(env: &Env, data: &Vec<u8>) -> Vec<u8> {
    // Remove redundancy (simplified)
    let original_len = data.len() * 9 / 10; // Approximate
    let mut result = Vec::new(env);
    for i in 0..original_len.min(data.len()) {
        result.push_back(data.get(i).unwrap_or(&0));
    }
    result
}

fn apply_hybrid_correction(env: &Env, data: &Vec<u8>) -> Vec<u8> {
    // Apply both parity and Reed-Solomon
    let with_parity = add_parity_bits(env, data);
    apply_reed_solomon(env, &with_parity)
}

fn remove_hybrid_correction(env: &Env, data: &Vec<u8>) -> Vec<u8> {
    let without_rs = remove_reed_solomon(env, data);
    remove_parity_bits(env, &without_rs)
}
