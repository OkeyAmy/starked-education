#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec, Symbol, 
    Map, BytesN, panic_with_error, log
};

/// Attestation status enumeration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AttestationStatus {
    Pending = 0,
    Verified = 1,
    Disputed = 2,
    Revoked = 3,
    Expired = 4,
}

/// Verifier reputation tier
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ReputationTier {
    Unverified = 0,
    Bronze = 1,
    Silver = 2,
    Gold = 3,
    Platinum = 4,
}

/// Attestation record with cryptographic proof
#[contracttype]
#[derive(Clone)]
pub struct Attestation {
    pub id: u64,
    pub credential_id: u64,
    pub verifier: Address,
    pub attestation_hash: BytesN<32>,
    pub timestamp: u64,
    pub expires_at: u64,
    pub status: AttestationStatus,
    pub weight: u32,
    pub metadata_hash: String,
    pub zk_proof_hash: Option<BytesN<32>>,
}

/// Verifier profile with reputation scoring
#[contracttype]
#[derive(Clone)]
pub struct VerifierProfile {
    pub address: Address,
    pub institution: String,
    pub reputation_score: u64,
    pub total_attestations: u32,
    pub successful_attestations: u32,
    pub disputed_attestations: u32,
    pub stake_amount: i128,
    pub tier: ReputationTier,
    pub registered_at: u64,
    pub last_active: u64,
    pub is_active: bool,
}

/// Dispute record for challenge mechanism
#[contracttype]
#[derive(Clone)]
pub struct Dispute {
    pub id: u64,
    pub attestation_id: u64,
    pub challenger: Address,
    pub reason: String,
    pub evidence_hash: BytesN<32>,
    pub stake_amount: i128,
    pub created_at: u64,
    pub resolved_at: Option<u64>,
    pub resolution: Option<DisputeResolution>,
    pub votes_for: u32,
    pub votes_against: u32,
}

/// Dispute resolution outcome
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DisputeResolution {
    AttestationValid = 0,
    AttestationInvalid = 1,
    Inconclusive = 2,
}

/// Cross-institution recognition record
#[contracttype]
#[derive(Clone)]
pub struct InstitutionRecognition {
    pub institution_a: Address,
    pub institution_b: Address,
    pub recognition_level: u32,
    pub established_at: u64,
    pub mutual: bool,
}

/// Attestation analytics data
#[contracttype]
#[derive(Clone)]
pub struct AttestationAnalytics {
    pub credential_id: u64,
    pub total_attestations: u32,
    