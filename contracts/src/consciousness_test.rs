use crate::consciousness::{
    ConsciousnessContract, ConsciousnessData, ConsciousnessInterface, ContinuityProof,
};
use soroban_sdk::Env;
use soroban_sdk::{Address, Bytes, Map, Vec};

#[test]
fn test_consciousness_upload_and_verification() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ConsciousnessContract);
    let client = ConsciousnessContract::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let neural_data = Vec::from_slice(&env, &[1u8, 2u8, 3u8, 4u8, 5u8]);
    let encoding_version = 1u32;

    // Upload consciousness
    let consciousness_id = client.upload_consciousness(
        &owner,
        &neural_data,
        &encoding_version,
        None::<ContinuityProof>,
    );

    // Verify consciousness exists
    let metadata = client.get_consciousness_metadata(&consciousness_id);
    assert_eq!(metadata.owner, owner);
    assert_eq!(metadata.encoding_version, encoding_version);
    assert_eq!(metadata.evolution_stage, 1);

    // Test verification
    let verification_hash = env.crypto().sha256(&neural_data);
    assert!(client.verify_consciousness(&consciousness_id, &verification_hash));
}

#[test]
fn test_consciousness_transfer() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ConsciousnessContract);
    let client = ConsciousnessContract::new(&env, &contract_id);

    let original_owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let neural_data = Vec::from_slice(&env, &[6u8, 7u8, 8u8, 9u8]);
    let encoding_version = 1u32;

    // Upload consciousness
    let consciousness_id = client.upload_consciousness(
        &original_owner,
        &neural_data,
        &encoding_version,
        None::<ContinuityProof>,
    );

    // Create transfer proof
    let transfer_proof = Bytes::from_slice(&env, b"transfer_proof");

    // Transfer consciousness
    let transfer_success =
        client.transfer_consciousness(&consciousness_id, &new_owner, &transfer_proof);

    assert!(transfer_success);

    // Verify new ownership
    let metadata = client.get_consciousness_metadata(&consciousness_id);
    assert_eq!(metadata.owner, new_owner);

    // Verify ownership lists updated
    let original_owned = client.get_owned_consciousnesses(&original_owner);
    let new_owned = client.get_owned_consciousnesses(&new_owner);

    assert!(original_owned.is_empty());
    assert_eq!(new_owned.len(), 1);
    assert_eq!(new_owned.get(0).unwrap(), consciousness_id);
}

#[test]
fn test_continuity_proof_creation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ConsciousnessContract);
    let client = ConsciousnessContract::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let neural_data = Vec::from_slice(&env, &[10u8, 11u8, 12u8]);
    let encoding_version = 1u32;

    // Upload first consciousness
    let first_consciousness_id = client.upload_consciousness(
        &owner,
        &neural_data,
        &encoding_version,
        None::<ContinuityProof>,
    );

    // Create continuity proof for second consciousness
    let knowledge_transfer_data = Vec::from_slice(&env, &[13u8, 14u8, 15u8]);
    let continuity_proof = client.create_continuity_proof(
        &first_consciousness_id,
        Some(first_consciousness_id),
        &knowledge_transfer_data,
    );

    // Upload second consciousness with continuity proof
    let second_neural_data = Vec::from_slice(&env, &[16u8, 17u8, 18u8]);
    let second_consciousness_id = client.upload_consciousness(
        &owner,
        &second_neural_data,
        &encoding_version + 1,
        Some(continuity_proof),
    );

    // Verify both consciousnesses exist
    let first_metadata = client.get_consciousness_metadata(&first_consciousness_id);
    let second_metadata = client.get_consciousness_metadata(&second_consciousness_id);

    assert_eq!(first_metadata.evolution_stage, 1);
    assert_eq!(second_metadata.evolution_stage, 1);
    assert_eq!(second_metadata.encoding_version, encoding_version + 1);
}

#[test]
fn test_marketplace_listing_and_purchase() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ConsciousnessContract);
    let client = ConsciousnessContract::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let buyer = Address::generate(&env);
    let neural_data = Vec::from_slice(&env, &[19u8, 20u8, 21u8]);
    let encoding_version = 1u32;
    let price = 1000u64;
    let access_duration = 86400u64; // 24 hours
    let license_type = 1u8; // ReadOnly

    // Upload consciousness
    let consciousness_id = client.upload_consciousness(
        &owner,
        &neural_data,
        &encoding_version,
        None::<ContinuityProof>,
    );

    // List on marketplace
    let listing_success =
        client.list_on_marketplace(&consciousness_id, &price, &access_duration, &license_type);
    assert!(listing_success);

    // Purchase access
    let payment_proof = Bytes::from_slice(&env, b"payment_proof");
    let purchase_success =
        client.purchase_consciousness_access(&consciousness_id, &buyer, &payment_proof);
    assert!(purchase_success);
}

#[test]
fn test_evolution_update() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ConsciousnessContract);
    let client = ConsciousnessContract::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let initial_neural_data = Vec::from_slice(&env, &[22u8, 23u8, 24u8]);
    let encoding_version = 1u32;

    // Upload consciousness
    let consciousness_id = client.upload_consciousness(
        &owner,
        &initial_neural_data,
        &encoding_version,
        None::<ContinuityProof>,
    );

    // Check initial evolution stage
    let initial_metadata = client.get_consciousness_metadata(&consciousness_id);
    assert_eq!(initial_metadata.evolution_stage, 1);

    // Update with new knowledge
    let new_knowledge = Vec::from_slice(&env, &[25u8, 26u8, 27u8, 28u8]);
    let update_success = client.update_evolution(&consciousness_id, &new_knowledge);
    assert!(update_success);

    // Verify evolution
    let updated_metadata = client.get_consciousness_metadata(&consciousness_id);
    assert_eq!(updated_metadata.evolution_stage, 2);
    assert_eq!(updated_metadata.knowledge_vector, new_knowledge);
    assert!(updated_metadata.experience_timestamp > initial_metadata.experience_timestamp);
}

#[test]
fn test_verification_failure() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ConsciousnessContract);
    let client = ConsciousnessContract::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let neural_data = Vec::from_slice(&env, &[29u8, 30u8, 31u8]);
    let encoding_version = 1u32;

    // Upload consciousness
    let consciousness_id = client.upload_consciousness(
        &owner,
        &neural_data,
        &encoding_version,
        None::<ContinuityProof>,
    );

    // Try verification with wrong hash
    let wrong_hash = env.crypto().sha256(&Vec::from_slice(&env, &[99u8]));
    assert!(!client.verify_consciousness(&consciousness_id, &wrong_hash));
}

#[test]
fn test_nonexistent_consciousness() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ConsciousnessContract);
    let client = ConsciousnessContract::new(&env, &contract_id);

    let fake_consciousness_id = Bytes::from_slice(&env, b"fake_consciousness");

    // Should panic when trying to get metadata for non-existent consciousness
    let result = std::panic::catch_unwind(|| {
        client.get_consciousness_metadata(&fake_consciousness_id);
    });

    assert!(result.is_err());
}
