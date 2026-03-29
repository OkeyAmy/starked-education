use soroban_sdk::crypto::Hash;
use soroban_sdk::xdr::ToXdr;
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Bytes, Env, Map, String, Symbol, Vec,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConsciousnessData {
    pub consciousness_id: Bytes,
    pub owner: Address,
    pub encoding_version: u32,
    pub neural_hash: Hash,
    pub knowledge_vector: Vec<u8>,
    pub experience_timestamp: u64,
    pub continuity_proof: Bytes,
    pub evolution_stage: u8,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContinuityProof {
    pub previous_consciousness_id: Option<Bytes>,
    pub lifetime_transition_hash: Hash,
    pub knowledge_transfer_ratio: u32, // Percentage 0-10000 (0-100%)
    pub memory_integrity_score: u32,   // 0-10000
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConsciousnessMarketplaceItem {
    pub consciousness_id: Bytes,
    pub price: u64,
    pub access_duration: u64, // In seconds
    pub license_type: u8,     // 0: Full, 1: ReadOnly, 2: Learning
    pub verification_required: bool,
}

pub struct ConsciousnessContract;

#[contract]
pub trait ConsciousnessInterface {
    /// Upload consciousness data to blockchain
    fn upload_consciousness(
        env: Env,
        owner: Address,
        neural_data: Vec<u8>,
        encoding_version: u32,
        continuity_proof: Option<ContinuityProof>,
    ) -> Bytes;

    /// Verify consciousness integrity and authenticity
    fn verify_consciousness(env: Env, consciousness_id: Bytes, verification_hash: Hash) -> bool;

    /// Transfer consciousness between platforms or owners
    fn transfer_consciousness(
        env: Env,
        consciousness_id: Bytes,
        new_owner: Address,
        transfer_proof: Bytes,
    ) -> bool;

    /// Create continuity proof for lifetime transitions
    fn create_continuity_proof(
        env: Env,
        current_consciousness_id: Bytes,
        previous_consciousness_id: Option<Bytes>,
        knowledge_transfer_data: Vec<u8>,
    ) -> ContinuityProof;

    /// List consciousness on marketplace
    fn list_on_marketplace(
        env: Env,
        consciousness_id: Bytes,
        price: u64,
        access_duration: u64,
        license_type: u8,
    ) -> bool;

    /// Purchase access to consciousness data
    fn purchase_consciousness_access(
        env: Env,
        consciousness_id: Bytes,
        buyer: Address,
        payment_proof: Bytes,
    ) -> bool;

    /// Update consciousness evolution stage
    fn update_evolution(env: Env, consciousness_id: Bytes, new_knowledge: Vec<u8>) -> bool;

    /// Get consciousness metadata
    fn get_consciousness_metadata(env: Env, consciousness_id: Bytes) -> ConsciousnessData;

    /// Get all consciousnesses owned by an address
    fn get_owned_consciousnesses(env: Env, owner: Address) -> Vec<Bytes>;
}

#[contractimpl]
impl ConsciousnessInterface for ConsciousnessContract {
    fn upload_consciousness(
        env: Env,
        owner: Address,
        neural_data: Vec<u8>,
        encoding_version: u32,
        continuity_proof: Option<ContinuityProof>,
    ) -> Bytes {
        // Generate unique consciousness ID
        let consciousness_id = env
            .crypto()
            .sha256(&[&owner.to_xdr(env), &neural_data].concat());

        // Create neural hash for verification
        let neural_hash = env.crypto().sha256(&neural_data);

        // Create consciousness data structure
        let consciousness_data = ConsciousnessData {
            consciousness_id: consciousness_id.clone(),
            owner: owner.clone(),
            encoding_version,
            neural_hash,
            knowledge_vector: neural_data,
            experience_timestamp: env.ledger().timestamp(),
            continuity_proof: continuity_proof
                .as_ref()
                .map(|proof| env.crypto().sha256(&proof.to_xdr(env)))
                .unwrap_or_else(|| Bytes::from_slice(env, &[0u8; 32])),
            evolution_stage: 1,
        };

        // Store consciousness data
        let consciousness_key = Symbol::new(&env, "consciousness");
        let consciousness_map: Map<Bytes, ConsciousnessData> = env
            .storage()
            .instance()
            .get(&consciousness_key)
            .unwrap_or_else(|| Map::new(&env));

        consciousness_map.set(consciousness_id.clone(), consciousness_data);
        env.storage()
            .instance()
            .set(&consciousness_key, &consciousness_map);

        // Update owner's consciousness list
        let owner_key = Symbol::new(&env, "owner_consciousnesses");
        let mut owner_map: Map<Address, Vec<Bytes>> = env
            .storage()
            .instance()
            .get(&owner_key)
            .unwrap_or_else(|| Map::new(&env));

        let mut consciousness_list = owner_map
            .get(owner.clone())
            .unwrap_or_else(|| Vec::new(&env));
        consciousness_list.push_back(consciousness_id.clone());
        owner_map.set(owner, consciousness_list);
        env.storage().instance().set(&owner_key, &owner_map);

        consciousness_id
    }

    fn verify_consciousness(env: Env, consciousness_id: Bytes, verification_hash: Hash) -> bool {
        let consciousness_key = Symbol::new(&env, "consciousness");
        let consciousness_map: Map<Bytes, ConsciousnessData> = env
            .storage()
            .instance()
            .get(&consciousness_key)
            .unwrap_or_else(|| Map::new(&env));

        if let Some(consciousness_data) = consciousness_map.get(consciousness_id) {
            // Verify neural hash matches
            consciousness_data.neural_hash == verification_hash
        } else {
            false
        }
    }

    fn transfer_consciousness(
        env: Env,
        consciousness_id: Bytes,
        new_owner: Address,
        transfer_proof: Bytes,
    ) -> bool {
        let consciousness_key = Symbol::new(&env, "consciousness");
        let mut consciousness_map: Map<Bytes, ConsciousnessData> = env
            .storage()
            .instance()
            .get(&consciousness_key)
            .unwrap_or_else(|| Map::new(&env));

        if let Some(mut consciousness_data) = consciousness_map.get(consciousness_id.clone()) {
            let old_owner = consciousness_data.owner.clone();

            // Verify transfer proof (simplified - in production would use multi-sig)
            let proof_hash = env.crypto().sha256(&transfer_proof);
            let expected_hash = env.crypto().sha256(
                &[
                    &consciousness_id.to_xdr(env),
                    &old_owner.to_xdr(env),
                    &new_owner.to_xdr(env),
                ]
                .concat(),
            );

            if proof_hash != expected_hash {
                return false;
            }

            // Update owner
            consciousness_data.owner = new_owner.clone();
            consciousness_map.set(consciousness_id.clone(), consciousness_data);
            env.storage()
                .instance()
                .set(&consciousness_key, &consciousness_map);

            // Update owner consciousness lists
            let owner_key = Symbol::new(&env, "owner_consciousnesses");
            let mut owner_map: Map<Address, Vec<Bytes>> = env
                .storage()
                .instance()
                .get(&owner_key)
                .unwrap_or_else(|| Map::new(&env));

            // Remove from old owner
            if let Some(mut old_list) = owner_map.get(old_owner) {
                old_list = old_list
                    .iter()
                    .filter(|id| id != &consciousness_id)
                    .collect();
                owner_map.set(old_owner, old_list);
            }

            // Add to new owner
            let mut new_list = owner_map
                .get(new_owner.clone())
                .unwrap_or_else(|| Vec::new(&env));
            new_list.push_back(consciousness_id.clone());
            owner_map.set(new_owner, new_list);
            env.storage().instance().set(&owner_key, &owner_map);

            true
        } else {
            false
        }
    }

    fn create_continuity_proof(
        env: Env,
        current_consciousness_id: Bytes,
        previous_consciousness_id: Option<Bytes>,
        knowledge_transfer_data: Vec<u8>,
    ) -> ContinuityProof {
        let lifetime_transition_hash = env.crypto().sha256(
            &[
                &current_consciousness_id.to_xdr(env),
                &previous_consciousness_id
                    .as_ref()
                    .map(|id| id.to_xdr(env))
                    .unwrap_or_else(|| Vec::new(&env)),
                &knowledge_transfer_data,
            ]
            .concat(),
        );

        // Calculate knowledge transfer ratio (simplified algorithm)
        let knowledge_transfer_ratio = if knowledge_transfer_data.is_empty() {
            0
        } else {
            // In production, this would use sophisticated ML algorithms
            // For now, use a simple heuristic based on data size
            std::cmp::min(knowledge_transfer_data.len() as u32 * 10, 10000)
        };

        // Calculate memory integrity score (simplified)
        let memory_integrity_score = if knowledge_transfer_data.is_empty() {
            5000 // 50% default
        } else {
            std::cmp::min(knowledge_transfer_data.len() as u32 * 15, 10000)
        };

        ContinuityProof {
            previous_consciousness_id,
            lifetime_transition_hash,
            knowledge_transfer_ratio,
            memory_integrity_score,
        }
    }

    fn list_on_marketplace(
        env: Env,
        consciousness_id: Bytes,
        price: u64,
        access_duration: u64,
        license_type: u8,
    ) -> bool {
        let consciousness_key = Symbol::new(&env, "consciousness");
        let consciousness_map: Map<Bytes, ConsciousnessData> = env
            .storage()
            .instance()
            .get(&consciousness_key)
            .unwrap_or_else(|| Map::new(&env));

        // Verify consciousness exists and caller is owner
        if let Some(consciousness_data) = consciousness_map.get(consciousness_id.clone()) {
            let marketplace_key = Symbol::new(&env, "marketplace");
            let mut marketplace_map: Map<Bytes, ConsciousnessMarketplaceItem> = env
                .storage()
                .instance()
                .get(&marketplace_key)
                .unwrap_or_else(|| Map::new(&env));

            let marketplace_item = ConsciousnessMarketplaceItem {
                consciousness_id: consciousness_id.clone(),
                price,
                access_duration,
                license_type,
                verification_required: true,
            };

            marketplace_map.set(consciousness_id, marketplace_item);
            env.storage()
                .instance()
                .set(&marketplace_key, &marketplace_map);

            true
        } else {
            false
        }
    }

    fn purchase_consciousness_access(
        env: Env,
        consciousness_id: Bytes,
        buyer: Address,
        payment_proof: Bytes,
    ) -> bool {
        let marketplace_key = Symbol::new(&env, "marketplace");
        let marketplace_map: Map<Bytes, ConsciousnessMarketplaceItem> = env
            .storage()
            .instance()
            .get(&marketplace_key)
            .unwrap_or_else(|| Map::new(&env));

        if let Some(marketplace_item) = marketplace_map.get(consciousness_id) {
            // Verify payment (simplified - in production would integrate with payment processor)
            let payment_hash = env.crypto().sha256(&payment_proof);
            let expected_hash = env.crypto().sha256(
                &[
                    &consciousness_id.to_xdr(env),
                    &buyer.to_xdr(env),
                    &marketplace_item.price.to_xdr(env),
                ]
                .concat(),
            );

            if payment_hash != expected_hash {
                return false;
            }

            // Grant access by creating access record
            let access_key = Symbol::new(&env, "access_grants");
            let mut access_map: Map<Address, Vec<(Bytes, u64)>> = env
                .storage()
                .instance()
                .get(&access_key)
                .unwrap_or_else(|| Map::new(&env));

            let mut access_list = access_map
                .get(buyer.clone())
                .unwrap_or_else(|| Vec::new(&env));
            let expiry_time = env.ledger().timestamp() + marketplace_item.access_duration;
            access_list.push_back((consciousness_id, expiry_time));
            access_map.set(buyer, access_list);
            env.storage().instance().set(&access_key, &access_map);

            true
        } else {
            false
        }
    }

    fn update_evolution(env: Env, consciousness_id: Bytes, new_knowledge: Vec<u8>) -> bool {
        let consciousness_key = Symbol::new(&env, "consciousness");
        let mut consciousness_map: Map<Bytes, ConsciousnessData> = env
            .storage()
            .instance()
            .get(&consciousness_key)
            .unwrap_or_else(|| Map::new(&env));

        if let Some(mut consciousness_data) = consciousness_map.get(consciousness_id.clone()) {
            // Update knowledge vector and evolution stage
            consciousness_data.knowledge_vector = new_knowledge;
            consciousness_data.evolution_stage += 1;
            consciousness_data.experience_timestamp = env.ledger().timestamp();

            // Recalculate neural hash
            consciousness_data.neural_hash =
                env.crypto().sha256(&consciousness_data.knowledge_vector);

            consciousness_map.set(consciousness_id, consciousness_data);
            env.storage()
                .instance()
                .set(&consciousness_key, &consciousness_map);

            true
        } else {
            false
        }
    }

    fn get_consciousness_metadata(env: Env, consciousness_id: Bytes) -> ConsciousnessData {
        let consciousness_key = Symbol::new(&env, "consciousness");
        let consciousness_map: Map<Bytes, ConsciousnessData> = env
            .storage()
            .instance()
            .get(&consciousness_key)
            .unwrap_or_else(|| Map::new(&env));

        consciousness_map
            .get(consciousness_id)
            .unwrap_or_else(|| panic_with_error!(env, "Consciousness not found"))
    }

    fn get_owned_consciousnesses(env: Env, owner: Address) -> Vec<Bytes> {
        let owner_key = Symbol::new(&env, "owner_consciousnesses");
        let owner_map: Map<Address, Vec<Bytes>> = env
            .storage()
            .instance()
            .get(&owner_key)
            .unwrap_or_else(|| Map::new(&env));

        owner_map.get(owner).unwrap_or_else(|| Vec::new(&env))
    }
}
