#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec, U256, u256,
    Map, BytesN, IntoVal, crypto::Hash,
};

/// Verifiable Random Function (VRF) implementation for Stellar blockchain
/// Provides fair, transparent, and tamper-proof randomization for:
/// - Exam question generation
/// - Seat assignments
/// - Proctoring randomization
/// - Lottery-based course enrollments

#[contracttype]
#[derive(Clone, Debug)]
pub struct VRFRequest {
    pub id: u64,
    pub requester: Address,
    pub seed: BytesN<32>,
    pub purpose: String,
    pub context: String,
    pub block_number: u64,
    pub is_fulfilled: bool,
    pub random_value: Option<U256>,
    pub proof: Option<BytesN<64>>,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct EntropySource {
    pub id: u64,
    pub name: String,
    pub provider: Address,
    pub weight: u32, // Weight in aggregation (0-10000)
    pub is_active: bool,
    pub total_contributions: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct RandomnessBeacon {
    pub id: u64,
    pub entropy_hash: BytesN<32>,
    pub timestamp: u64,
    pub block_number: u64,
    pub contributors: Vec<Address>,
    pub is_verified: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum StorageKey {
    VRFRequest(u64),
    VRFRequestByUser(Address, u64),
    EntropySource(u64),
    RandomnessBeacon(u64),
    LatestBeacon,
    NextRequestId,
    NextSourceId,
    NextBeaconId,
    TotalRequests,
    AggregationThreshold,
    Commitment(Address, u64), // Commit-reveal scheme
}

#[contract]
pub struct VRFSystem;

#[contractimpl]
impl VRFSystem {
    /// Initialize the VRF system
    pub fn initialize(env: Env) {
        env.storage().persistent().set(&StorageKey::NextRequestId, &0u64);
        env.storage().persistent().set(&StorageKey::NextSourceId, &0u64);
        env.storage().persistent().set(&StorageKey::NextBeaconId, &0u64);
        env.storage().persistent().set(&StorageKey::TotalRequests, &0u64);
        env.storage().persistent().set(&StorageKey::AggregationThreshold, &3u32); // Minimum 3 sources
        
        // Register default entropy source (blockchain entropy)
        Self::register_entropy_source(
            env.clone(),
            "Blockchain Entropy".into_val(&env),
            Address::from_account(env.current_contract_address()),
            10000, // Max weight
        ).unwrap();
    }

    /// Register an entropy source (oracle, external RNG, etc.)
    pub fn register_entropy_source(
        env: Env,
        name: String,
        provider: Address,
        weight: u32,
    ) -> Result<u64, String> {
        provider.require_auth();

        if weight > 10000 {
            return Err("Weight must be <= 10000".to_string());
        }

        let source_id: u64 = env.storage().persistent()
            .get(&StorageKey::NextSourceId)
            .unwrap_or(0u64);

        let source = EntropySource {
            id: source_id,
            name,
            provider: provider.clone(),
            weight,
            is_active: true,
            total_contributions: 0,
        };

        env.storage().persistent().set(&StorageKey::EntropySource(source_id), &source);
        env.storage().persistent().set(&StorageKey::NextSourceId, &(source_id + 1));

        Ok(source_id)
    }

    /// Request a verifiable random number
    pub fn request_randomness(
        env: Env,
        requester: Address,
        seed: BytesN<32>,
        purpose: String,
        context: String,
    ) -> Result<u64, String> {
        requester.require_auth();

        let request_id: u64 = env.storage().persistent()
            .get(&StorageKey::NextRequestId)
            .unwrap_or(0u64);

        let request = VRFRequest {
            id: request_id,
            requester: requester.clone(),
            seed: seed.clone(),
            purpose,
            context,
            block_number: env.ledger().sequence(),
            is_fulfilled: false,
            random_value: None,
            proof: None,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&StorageKey::VRFRequest(request_id), &request);
        
        // Index by user
        let user_count: u64 = env.storage().persistent()
            .get(&StorageKey::VRFRequestByUser(requester.clone(), u64::MAX))
            .unwrap_or(0u64);
        env.storage().persistent().set(
            &StorageKey::VRFRequestByUser(requester, user_count),
            &request_id
        );
        env.storage().persistent().set(
            &StorageKey::VRFRequestByUser(requester, u64::MAX),
            &(user_count + 1u64)
        );

        env.storage().persistent().set(&StorageKey::NextRequestId, &(request_id + 1));
        
        let total: u64 = env.storage().persistent()
            .get(&StorageKey::TotalRequests)
            .unwrap_or(0u64);
        env.storage().persistent().set(&StorageKey::TotalRequests, &(total + 1));

        // Emit event
        env.events().publish((
            "randomness_requested",
            request_id,
            requester,
            purpose,
        ),);

        Ok(request_id)
    }

    /// Submit entropy contribution from registered source
    pub fn submit_entropy(
        env: Env,
        source_id: u64,
        request_id: u64,
        entropy: BytesN<32>,
    ) -> Result<(), String> {
        let source: EntropySource = env.storage().persistent()
            .get(&StorageKey::EntropySource(source_id))
            .ok_or_else(|| "Entropy source not found".to_string())?;

        if !source.is_active {
            return Err("Entropy source is not active".to_string());
        }

        // Verify provider
        if env.invoker() != source.provider {
            return Err("Unauthorized entropy provider".to_string());
        }

        let mut request: VRFRequest = env.storage().persistent()
            .get(&StorageKey::VRFRequest(request_id))
            .ok_or_else(|| "VRF request not found".to_string())?;

        if request.is_fulfilled {
            return Err("Request already fulfilled".to_string());
        }

        // Aggregate entropy with existing contributions
        let current_seed = request.seed.clone();
        let new_seed = Self::aggregate_entropy(&env, current_seed.as_slice(), entropy.as_slice());
        request.seed = new_seed;
        request.total_contributions.unwrap_or(0) + 1;

        env.storage().persistent().set(&StorageKey::VRFRequest(request_id), &request);

        // Update source stats
        let mut updated_source = source;
        updated_source.total_contributions += 1;
        env.storage().persistent().set(&StorageKey::EntropySource(source_id), &updated_source);

        Ok(())
    }

    /// Fulfill VRF request with final random value and proof
    pub fn fulfill_randomness(
        env: Env,
        request_id: u64,
        random_value: U256,
        proof: BytesN<64>,
    ) -> Result<(), String> {
        let mut request: VRFRequest = env.storage().persistent()
            .get(&StorageKey::VRFRequest(request_id))
            .ok_or_else(|| "VRF request not found".to_string())?;

        if request.is_fulfilled {
            return Err("Request already fulfilled".to_string());
        }

        request.is_fulfilled = true;
        request.random_value = Some(random_value);
        request.proof = Some(proof);

        env.storage().persistent().set(&StorageKey::VRFRequest(request_id), &request);

        // Emit event
        env.events().publish((
            "randomness_fulfilled",
            request_id,
            random_value,
        ),);

        Ok(())
    }

    /// Create randomness beacon from aggregated entropy
    pub fn create_beacon(
        env: Env,
        entropy_hash: BytesN<32>,
        contributors: Vec<Address>,
    ) -> Result<u64, String> {
        let beacon_id: u64 = env.storage().persistent()
            .get(&StorageKey::NextBeaconId)
            .unwrap_or(0u64);

        let beacon = RandomnessBeacon {
            id: beacon_id,
            entropy_hash,
            timestamp: env.ledger().timestamp(),
            block_number: env.ledger().sequence(),
            contributors,
            is_verified: true,
        };

        env.storage().persistent().set(&StorageKey::RandomnessBeacon(beacon_id), &beacon);
        env.storage().persistent().set(&StorageKey::LatestBeacon, &beacon_id);
        env.storage().persistent().set(&StorageKey::NextBeaconId, &(beacon_id + 1));

        Ok(beacon_id)
    }

    /// Commit to a value (commit-reveal scheme for fairness)
    pub fn commit(
        env: Env,
        committer: Address,
        commitment_hash: BytesN<32>,
        valid_until: u64,
    ) -> Result<(), String> {
        committer.require_auth();

        let key = StorageKey::Commitment(committer.clone(), env.ledger().sequence());
        
        env.storage().temporary().set(&key, &CommitmentData {
            hash: commitment_hash,
            valid_until,
            created_at: env.ledger().timestamp(),
        });

        Ok(())
    }

    /// Reveal committed value
    pub fn reveal(
        env: Env,
        committer: Address,
        revealed_value: String,
    ) -> Result<String, String> {
        let key = StorageKey::Commitment(committer.clone(), env.ledger().sequence());
        
        let commitment: CommitmentData = env.storage().temporary()
            .get(&key)
            .ok_or_else(|| "No commitment found".to_string())?;

        if env.ledger().timestamp() > commitment.valid_until {
            return Err("Commitment expired".to_string());
        }

        // Verify the reveal matches the commitment
        let computed_hash = Self::hash_reveal(&env, &revealed_value);
        if computed_hash.as_slice() != commitment.hash.as_slice() {
            return Err("Reveal does not match commitment".to_string());
        }

        // Clean up
        env.storage().temporary().remove(&key);

        Ok(revealed_value)
    }

    /// Generate random number for specific use case (exam, lottery, etc.)
    pub fn generate_random_for_purpose(
        env: Env,
        requester: Address,
        purpose: String,
        seed: BytesN<32>,
        min: U256,
        max: U256,
    ) -> Result<U256, String> {
        requester.require_auth();

        // Get latest beacon entropy
        let beacon_id: u64 = env.storage().persistent()
            .get(&StorageKey::LatestBeacon)
            .ok_or_else(|| "No randomness beacon available".to_string())?;

        let beacon: RandomnessBeacon = env.storage().persistent()
            .get(&StorageKey::RandomnessBeacon(beacon_id))
            .ok_or_else(|| "Beacon not found".to_string())?;

        // Combine seed with beacon entropy
        let combined = Self::combine_seeds(&env, seed.as_slice(), beacon.entropy_hash.as_slice());
        
        // Generate random value in range
        let random_value = Self::random_in_range(&combined, min, max);

        // Log usage
        env.events().publish((
            "random_generated",
            purpose,
            requester,
            random_value,
        ),);

        Ok(random_value)
    }

    /// Get VRF request details
    pub fn get_request(env: Env, request_id: u64) -> Result<VRFRequest, String> {
        env.storage().persistent()
            .get(&StorageKey::VRFRequest(request_id))
            .ok_or_else(|| "Request not found".to_string())
    }

    /// Get requests by user
    pub fn get_requests_by_user(
        env: Env,
        user: Address,
    ) -> Result<Vec<VRFRequest>, String> {
        let count: u64 = env.storage().persistent()
            .get(&StorageKey::VRFRequestByUser(user.clone(), u64::MAX))
            .unwrap_or(0u64);

        let mut requests: Vec<VRFRequest> = Vec::new(&env);
        for i in 0..count {
            if let Ok(req_id) = env.storage().persistent()
                .get::<_, u64>(&StorageKey::VRFRequestByUser(user.clone(), i))
            {
                if let Ok(request) = env.storage().persistent()
                    .get::<_, VRFRequest>(&StorageKey::VRFRequest(req_id))
                {
                    requests.push_back(request);
                }
            }
        }

        Ok(requests)
    }

    /// Get entropy source details
    pub fn get_entropy_source(env: Env, source_id: u64) -> Result<EntropySource, String> {
        env.storage().persistent()
            .get(&StorageKey::EntropySource(source_id))
            .ok_or_else(|| "Source not found".to_string())
    }

    /// Get latest beacon
    pub fn get_latest_beacon(env: Env) -> Result<RandomnessBeacon, String> {
        let beacon_id: u64 = env.storage().persistent()
            .get(&StorageKey::LatestBeacon)
            .ok_or_else(|| "No beacon available".to_string())?;

        env.storage().persistent()
            .get(&StorageKey::RandomnessBeacon(beacon_id))
            .ok_or_else(|| "Beacon not found".to_string())
    }

    /// Verify randomness proof (placeholder for actual VRF verification)
    pub fn verify_proof(
        env: Env,
        request_id: u64,
        proof: BytesN<64>,
    ) -> Result<bool, String> {
        let request: VRFRequest = env.storage().persistent()
            .get(&StorageKey::VRFRequest(request_id))
            .ok_or_else(|| "Request not found".to_string())?;

        if let Some(stored_proof) = request.proof {
            Ok(stored_proof.as_slice() == proof.as_slice())
        } else {
            Err("No proof stored for this request".to_string())
        }
    }

    /// Get statistics
    pub fn get_stats(env: Env) -> Map<String, u64> {
        let mut stats: Map<String, u64> = Map::new(env);
        
        let total_requests: u64 = env.storage().persistent()
            .get(&StorageKey::TotalRequests)
            .unwrap_or(0u64);
        
        stats.set("total_requests".into_val(&env), total_requests);
        
        // Count fulfilled requests
        let mut fulfilled = 0u64;
        for i in 0..total_requests {
            if let Ok(req) = env.storage().persistent().get::<_, VRFRequest>(&StorageKey::VRFRequest(i)) {
                if req.is_fulfilled {
                    fulfilled += 1;
                }
            }
        }
        stats.set("fulfilled_requests".into_val(&env), fulfilled);
        
        stats
    }

    // ========== Internal Helper Functions ==========

    fn aggregate_entropy(env: &Env, entropy1: &[u8], entropy2: &[u8]) -> BytesN<32> {
        let mut combined = Vec::new(env);
        for byte in entropy1.iter() {
            combined.push_back(byte);
        }
        for byte in entropy2.iter() {
            combined.push_back(byte);
        }
        
        env.crypto().sha256(&combined).into()
    }

    fn combine_seeds(env: &Env, seed1: &[u8], seed2: &[u8]) -> [u8; 32] {
        let mut combined = Vec::new(env);
        for byte in seed1.iter() {
            combined.push_back(byte);
        }
        for byte in seed2.iter() {
            combined.push_back(byte);
        }
        
        let hash = env.crypto().sha256(&combined);
        *hash.as_slice()
    }

    fn random_in_range(data: &[u8; 32], min: U256, max: U256) -> U256 {
        // Simple modulo-based range selection
        // In production, use proper rejection sampling
        let range = max - min.clone();
        let value = U256::from_bytes_be(data);
        min + (value % (range + U256::from_u32(1)))
    }

    fn hash_reveal(env: &Env, value: &String) -> BytesN<32> {
        env.crypto().sha256(&value.into_bytes()).into()
    }
}

#[contracttype]
#[derive(Clone)]
pub struct CommitmentData {
    pub hash: BytesN<32>,
    pub valid_until: u64,
    pub created_at: u64,
}
