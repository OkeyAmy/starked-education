#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, BytesN};

fn create_test_payload(env: &Env) -> BytesN<256> {
    BytesN::from_array(env, &[42u8; 256])
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CrossProtocolBridge);
    let client = CrossProtocolBridgeClient::new(&env, &contract_id);
    
    client.initialize();
    
    // Verify Stellar chain is registered
    let stats = client.get_stats();
    assert!(stats.contains_key("total_messages".into_val(&env)));
}

#[test]
fn test_register_supported_chain() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CrossProtocolBridge);
    let client = CrossProtocolBridgeClient::new(&env, &contract_id);
    
    client.initialize();
    
    // Register Ethereum chain
    env.mock_all_auths();
    client.register_supported_chain(&1u64, &"Ethereum".into_val(&env));
    
    // Verify gas price is set
    let gas_cost = client.calculate_gas_cost(&1u64, &100u64);
    assert_eq!(gas_cost, 10000u64); // 100 * 100
}

#[test]
fn test_register_protocol_adapter() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CrossProtocolBridge);
    let client = CrossProtocolBridgeClient::new(&env, &contract_id);
    
    client.initialize();
    
    let chains = Vec::from_array(&env, [0u64, 1u64]);
    
    env.mock_all_auths();
    let adapter_id = client.register_protocol_adapter(
        &"LayerZero".into_val(&env),
        &"Messaging".into_val(&env),
        &chains,
    );
    
    assert_eq!(adapter_id, 0u64);
    
    // Verify adapter
    let adapter = client.get_protocol_adapter(&adapter_id);
    assert_eq!(adapter.name, String::from_str(&env, "LayerZero"));
    assert!(adapter.is_active);
    assert_eq!(adapter.supported_chains.len(), 2);
}

#[test]
fn test_send_message() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CrossProtocolBridge);
    let client = CrossProtocolBridgeClient::new(&env, &contract_id);
    
    client.initialize();
    
    // Register destination chain
    env.mock_all_auths();
    client.register_supported_chain(&1u64, &"Ethereum".into_val(&env));
    
    let sender = Address::generate(&env);
    let payload = create_test_payload(&env);
    
    env.mock_all_auths();
    let message_id = client.send_message(
        &sender,
        &1u64,
        &payload,
        &MessageType::CredentialVerification,
        &1000u64,
    );
    
    assert_eq!(message_id, 0u64);
    
    // Verify message
    let message = client.get_message(&message_id);
    assert_eq!(message.sender, sender);
    assert_eq!(message.destination_chain, 1u64);
    assert_eq!(message.status, MessageStatus::Pending);
    assert_eq!(message.nonce, 0u64);
}

#[test]
fn test_deliver_message() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CrossProtocolBridge);
    let client = CrossProtocolBridgeClient::new(&env, &contract_id);
    
    client.initialize();
    
    // Register destination chain and send message
    env.mock_all_auths();
    client.register_supported_chain(&1u64, &"Ethereum".into_val(&env));
    
    let sender = Address::generate(&env);
    let payload = create_test_payload(&env);
    let message_id = client.send_message(
        &sender,
        &1u64,
        &payload,
        &MessageType::CredentialVerification,
        &1000u64,
    );
    
    // Deliver message
    let relayer = Address::generate(&env);
    env.mock_all_auths();
    client.deliver_message(&message_id, &relayer);
    
    // Verify delivery
    let message = client.get_message(&message_id);
    assert_eq!(message.status, MessageStatus::Delivered);
    assert!(message.delivered_at.is_some());
}

#[test]
fn test_batch_messages() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CrossProtocolBridge);
    let client = CrossProtocolBridgeClient::new(&env, &contract_id);
    
    client.initialize();
    
    // Register destination chain
    env.mock_all_auths();
    client.register_supported_chain(&1u64, &"Ethereum".into_val(&env));
    
    let sender = Address::generate(&env);
    let payload = create_test_payload(&env);
    
    env.mock_all_auths();
    
    // Send 3 messages
    let msg1 = client.send_message(&sender, &1u64, &payload, &MessageType::DataSync, &1000u64);
    let msg2 = client.send_message(&sender, &1u64, &payload, &MessageType::DataSync, &1000u64);
    let msg3 = client.send_message(&sender, &1u64, &payload, &MessageType::DataSync, &1000u64);
    
    // Batch them
    let message_ids = Vec::from_array(&env, [msg1, msg2, msg3]);
    let batch_id = client.batch_messages(&message_ids);
    
    assert_eq!(batch_id, 0u64);
    
    // Verify batch
    let batch = client.get_message_batch(&batch_id);
    assert_eq!(batch.len(), 3);
    
    // Verify messages are InTransit
    let message = client.get_message(&msg1);
    assert_eq!(message.status, MessageStatus::InTransit);
}

#[test]
fn test_submit_and_verify_state_proof() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CrossProtocolBridge);
    let client = CrossProtocolBridgeClient::new(&env, &contract_id);
    
    client.initialize();
    
    let state_root = BytesN::from_array(&env, &[55u8; 32]);
    let proof_data = BytesN::from_array(&env, &[77u8; 128]);
    let validators = Vec::from_array(&env, [
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
    ]);
    
    env.mock_all_auths();
    let proof_id = client.submit_state_proof(
        &100u64,
        &state_root,
        &proof_data,
        &validators,
    );
    
    assert_eq!(proof_id, 0u64);
    
    // Verify proof
    let is_valid = client.verify_state_proof(&proof_id);
    assert!(is_valid);
}

#[test]
fn test_insufficient_validator_signatures() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CrossProtocolBridge);
    let client = CrossProtocolBridgeClient::new(&env, &contract_id);
    
    client.initialize();
    
    let state_root = BytesN::from_array(&env, &[55u8; 32]);
    let proof_data = BytesN::from_array(&env, &[77u8; 128]);
    let validators = Vec::from_array(&env, [
        Address::generate(&env),
        Address::generate(&env),
    ]); // Only 2 validators
    
    env.mock_all_auths();
    let proof_id = client.submit_state_proof(&100u64, &state_root, &proof_data, &validators);
    
    // Should fail verification
    let result = client.try_verify_state_proof(&proof_id);
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Insufficient validator signatures"));
}

#[test]
fn test_get_messages_by_sender() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CrossProtocolBridge);
    let client = CrossProtocolBridgeClient::new(&env, &contract_id);
    
    client.initialize();
    
    // Register destination chain
    env.mock_all_auths();
    client.register_supported_chain(&1u64, &"Ethereum".into_val(&env));
    
    let sender = Address::generate(&env);
    let payload = create_test_payload(&env);
    
    env.mock_all_auths();
    
    // Send 3 messages from same sender
    client.send_message(&sender, &1u64, &payload, &MessageType::CredentialVerification, &1000u64);
    client.send_message(&sender, &1u64, &payload, &MessageType::DataSync, &1000u64);
    client.send_message(&sender, &1u64, &payload, &MessageType::TokenTransfer, &1000u64);
    
    let messages = client.get_messages_by_sender(&sender);
    assert_eq!(messages.len(), 3);
}

#[test]
fn test_unsupported_chain() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CrossProtocolBridge);
    let client = CrossProtocolBridgeClient::new(&env, &contract_id);
    
    client.initialize();
    
    let sender = Address::generate(&env);
    let payload = create_test_payload(&env);
    
    env.mock_all_auths();
    
    // Try to send to unsupported chain
    let result = client.try_send_message(
        &sender,
        &999u64, // Unsupported chain
        &payload,
        &MessageType::CredentialVerification,
        &1000u64,
    );
    
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Destination chain not supported"));
}

#[test]
fn test_statistics() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CrossProtocolBridge);
    let client = CrossProtocolBridgeClient::new(&env, &contract_id);
    
    client.initialize();
    
    // Register destination chain
    env.mock_all_auths();
    client.register_supported_chain(&1u64, &"Ethereum".into_val(&env));
    
    let sender = Address::generate(&env);
    let payload = create_test_payload(&env);
    
    env.mock_all_auths();
    
    // Send and deliver 2 messages
    let msg1 = client.send_message(&sender, &1u64, &payload, &MessageType::CredentialVerification, &1000u64);
    let msg2 = client.send_message(&sender, &1u64, &payload, &MessageType::DataSync, &1000u64);
    
    let relayer = Address::generate(&env);
    client.deliver_message(&msg1, &relayer);
    client.deliver_message(&msg2, &relayer);
    
    // Send 1 more (pending)
    client.send_message(&sender, &1u64, &payload, &MessageType::TokenTransfer, &1000u64);
    
    let stats = client.get_stats();
    assert_eq!(stats.get("total_messages".into_val(&env)).unwrap(), 3u64);
    assert_eq!(stats.get("delivered_messages".into_val(&env)).unwrap(), 2u64);
    assert_eq!(stats.get("pending_messages".into_val(&env)).unwrap(), 1u64);
}

#[test]
fn test_nonce_increment() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CrossProtocolBridge);
    let client = CrossProtocolBridgeClient::new(&env, &contract_id);
    
    client.initialize();
    
    // Register destination chain
    env.mock_all_auths();
    client.register_supported_chain(&1u64, &"Ethereum".into_val(&env));
    
    let sender = Address::generate(&env);
    let payload = create_test_payload(&env);
    
    env.mock_all_auths();
    
    // Send 3 messages to same destination
    let msg1 = client.send_message(&sender, &1u64, &payload, &MessageType::CredentialVerification, &1000u64);
    let msg2 = client.send_message(&sender, &1u64, &payload, &MessageType::DataSync, &1000u64);
    let msg3 = client.send_message(&sender, &1u64, &payload, &MessageType::TokenTransfer, &1000u64);
    
    // Verify nonces increment
    assert_eq!(client.get_message(&msg1).nonce, 0u64);
    assert_eq!(client.get_message(&msg2).nonce, 1u64);
    assert_eq!(client.get_message(&msg3).nonce, 2u64);
}
