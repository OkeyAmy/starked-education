#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec, U256, u256,
    Map, BytesN, IntoVal,
};

/// Cross-Protocol Communication Bridge for StarkEd
/// Enables credentials to interact with other blockchain protocols, DeFi applications,
/// and external systems through standardized messaging.

#[contracttype]
#[derive(Clone, Debug)]
pub struct CrossChainMessage {
    pub id: u64,
    pub sender: Address,
    pub source_chain: u64, // Chain ID of source
    pub destination_chain: u64, // Chain ID of destination
    pub payload: BytesN<256>, // Message payload
    pub message_type: MessageType,
    pub status: MessageStatus,
    pub gas_limit: u64,
    pub nonce: u64,
    pub created_at: u64,
    pub delivered_at: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ProtocolAdapter {
    pub id: u64,
    pub name: String,
    pub protocol_type: String,
    pub is_active: bool,
    pub supported_chains: Vec<u64>,
    pub total_messages: u64,
    pub success_rate: u32, // Basis points (0-10000)
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct StateProof {
    pub block_number: u64,
    pub state_root: BytesN<32>,
    pub proof_data: BytesN<128>,
    pub timestamp: u64,
    pub validator_signatures: Vec<Address>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub enum MessageType {
    CredentialVerification,
    DataSync,
    TokenTransfer,
    GovernanceVote,
    Custom,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum MessageStatus {
    Pending,
    InTransit,
    Delivered,
    Failed,
}

#[contracttype]
#[derive(Clone)]
pub enum StorageKey {
    Message(u64),
    MessageBySender(Address, u64),
    ProtocolAdapter(u64),
    SupportedChain(u64),
    StateProof(u64),
    MessageQueue(u64), // Batched messages
    NextMessageId,
    NextAdapterId,
    NextProofId,
    TotalMessages,
    GasPricePerChain(u64),
    DestinationNonce(u64), // Per destination chain
}

#[contract]
pub struct CrossProtocolBridge;

#[contractimpl]
impl CrossProtocolBridge {
    /// Initialize the bridge with supported chains
    pub fn initialize(env: Env) {
        env.storage().persistent().set(&StorageKey::NextMessageId, &0u64);
        env.storage().persistent().set(&StorageKey::NextAdapterId, &0u64);
        env.storage().persistent().set(&StorageKey::NextProofId, &0u64);
        env.storage().persistent().set(&StorageKey::TotalMessages, &0u64);
        
        // Register default Stellar chain
        Self::register_supported_chain(env.clone(), 0, "Stellar Mainnet".into_val(&env)).unwrap();
    }

    /// Register a supported blockchain
    pub fn register_supported_chain(
        env: Env,
        chain_id: u64,
        name: String,
    ) -> Result<(), String> {
        let admin = Self::get_admin(&env)?;
        admin.require_auth();

        env.storage().persistent().set(&StorageKey::SupportedChain(chain_id), &name);
        
        // Set default gas price
        env.storage().persistent().set(&StorageKey::GasPricePerChain(chain_id), &100u64);
        
        Ok(())
    }

    /// Register a protocol adapter
    pub fn register_protocol_adapter(
        env: Env,
        name: String,
        protocol_type: String,
        supported_chains: Vec<u64>,
    ) -> Result<u64, String> {
        let admin = Self::get_admin(&env)?;
        admin.require_auth();

        let adapter_id: u64 = env.storage().persistent()
            .get(&StorageKey::NextAdapterId)
            .unwrap_or(0u64);

        let adapter = ProtocolAdapter {
            id: adapter_id,
            name,
            protocol_type,
            is_active: true,
            supported_chains: supported_chains.clone(),
            total_messages: 0,
            success_rate: 10000, // 100% initially
        };

        env.storage().persistent().set(&StorageKey::ProtocolAdapter(adapter_id), &adapter);
        env.storage().persistent().set(&StorageKey::NextAdapterId, &(adapter_id + 1));

        Ok(adapter_id)
    }

    /// Send a cross-chain message
    pub fn send_message(
        env: Env,
        sender: Address,
        destination_chain: u64,
        payload: BytesN<256>,
        message_type: MessageType,
        gas_limit: u64,
    ) -> Result<u64, String> {
        sender.require_auth();

        // Verify destination chain is supported
        let is_supported: bool = env.storage().persistent()
            .get(&StorageKey::SupportedChain(destination_chain))
            .is_some();

        if !is_supported {
            return Err("Destination chain not supported".to_string());
        }

        let message_id: u64 = env.storage().persistent()
            .get(&StorageKey::NextMessageId)
            .unwrap_or(0u64);

        // Get and increment nonce for destination
        let nonce: u64 = env.storage().persistent()
            .get(&StorageKey::DestinationNonce(destination_chain))
            .unwrap_or(0u64);

        let message = CrossChainMessage {
            id: message_id,
            sender: sender.clone(),
            source_chain: 0, // Stellar
            destination_chain,
            payload,
            message_type: message_type.clone(),
            status: MessageStatus::Pending,
            gas_limit,
            nonce,
            created_at: env.ledger().timestamp(),
            delivered_at: None,
        };

        env.storage().persistent().set(&StorageKey::Message(message_id), &message);
        
        // Index by sender
        let sender_count: u64 = env.storage().persistent()
            .get(&StorageKey::MessageBySender(sender.clone(), u64::MAX))
            .unwrap_or(0u64);
        env.storage().persistent().set(
            &StorageKey::MessageBySender(sender, sender_count),
            &message_id
        );
        env.storage().persistent().set(
            &StorageKey::MessageBySender(sender, u64::MAX),
            &(sender_count + 1u64)
        );

        env.storage().persistent().set(&StorageKey::NextMessageId, &(message_id + 1));
        env.storage().persistent().set(&StorageKey::DestinationNonce(destination_chain), &(nonce + 1));
        
        let total: u64 = env.storage().persistent()
            .get(&StorageKey::TotalMessages)
            .unwrap_or(0u64);
        env.storage().persistent().set(&StorageKey::TotalMessages, &(total + 1));

        // Emit event
        env.events().publish((
            "message_sent",
            message_id,
            sender,
            destination_chain,
            message_type,
        ),);

        Ok(message_id)
    }

    /// Deliver a cross-chain message (called by relayer)
    pub fn deliver_message(
        env: Env,
        message_id: u64,
        relayer: Address,
    ) -> Result<(), String> {
        relayer.require_auth();

        let mut message: CrossChainMessage = env.storage().persistent()
            .get(&StorageKey::Message(message_id))
            .ok_or_else(|| "Message not found".to_string())?;

        if message.status != MessageStatus::Pending && 
           message.status != MessageStatus::InTransit {
            return Err("Message cannot be delivered in current status".to_string());
        }

        message.status = MessageStatus::Delivered;
        message.delivered_at = Some(env.ledger().timestamp());

        env.storage().persistent().set(&StorageKey::Message(message_id), &message);

        // Update adapter stats if applicable
        Self::update_adapter_stats(&env, &message.message_type, true)?;

        // Emit event
        env.events().publish((
            "message_delivered",
            message_id,
            message.destination_chain,
        ),);

        Ok(())
    }

    /// Batch multiple messages for gas optimization
    pub fn batch_messages(
        env: Env,
        message_ids: Vec<u64>,
    ) -> Result<u64, String> {
        let admin = Self::get_admin(&env)?;
        admin.require_auth();

        let batch_id: u64 = env.storage().persistent()
            .get(&StorageKey::NextProofId)
            .unwrap_or(0u64);

        // Validate all messages exist and are pending
        for i in 0..message_ids.len() {
            let mid = message_ids.get(i).unwrap();
            let message: CrossChainMessage = env.storage().persistent()
                .get(&StorageKey::Message(mid))
                .ok_or_else(|| format!("Message {} not found", mid))?;

            if message.status != MessageStatus::Pending {
                return Err(format!("Message {} is not pending", mid));
            }

            // Update status to InTransit
            let mut updated_message = message;
            updated_message.status = MessageStatus::InTransit;
            env.storage().persistent().set(&StorageKey::Message(mid), &updated_message);
        }

        env.storage().persistent().set(&StorageKey::MessageQueue(batch_id), &message_ids);
        env.storage().persistent().set(&StorageKey::NextProofId, &(batch_id + 1));

        // Emit event
        env.events().publish((
            "messages_batched",
            batch_id,
            message_ids.len(),
        ),);

        Ok(batch_id)
    }

    /// Submit state proof for verification
    pub fn submit_state_proof(
        env: Env,
        block_number: u64,
        state_root: BytesN<32>,
        proof_data: BytesN<128>,
        validator_signatures: Vec<Address>,
    ) -> Result<u64, String> {
        let proof_id: u64 = env.storage().persistent()
            .get(&StorageKey::NextProofId)
            .unwrap_or(0u64);

        let proof = StateProof {
            id: proof_id,
            block_number,
            state_root,
            proof_data,
            timestamp: env.ledger().timestamp(),
            validator_signatures,
        };

        env.storage().persistent().set(&StorageKey::StateProof(proof_id), &proof);
        env.storage().persistent().set(&StorageKey::NextProofId, &(proof_id + 1));

        Ok(proof_id)
    }

    /// Verify state proof
    pub fn verify_state_proof(
        env: Env,
        proof_id: u64,
    ) -> Result<bool, String> {
        let proof: StateProof = env.storage().persistent()
            .get(&StorageKey::StateProof(proof_id))
            .ok_or_else(|| "Proof not found".to_string())?;

        // Require minimum number of validator signatures
        if proof.validator_signatures.len() < 3 {
            return Err("Insufficient validator signatures".to_string());
        }

        // Simplified verification - in production use actual cryptographic verification
        let is_valid = proof.validator_signatures.len() >= 3;

        Ok(is_valid)
    }

    /// Get message details
    pub fn get_message(env: Env, message_id: u64) -> Result<CrossChainMessage, String> {
        env.storage().persistent()
            .get(&StorageKey::Message(message_id))
            .ok_or_else(|| "Message not found".to_string())
    }

    /// Get messages by sender
    pub fn get_messages_by_sender(
        env: Env,
        sender: Address,
    ) -> Result<Vec<CrossChainMessage>, String> {
        let count: u64 = env.storage().persistent()
            .get(&StorageKey::MessageBySender(sender.clone(), u64::MAX))
            .unwrap_or(0u64);

        let mut messages: Vec<CrossChainMessage> = Vec::new(&env);
        for i in 0..count {
            if let Ok(msg_id) = env.storage().persistent()
                .get::<_, u64>(&StorageKey::MessageBySender(sender.clone(), i))
            {
                if let Ok(message) = env.storage().persistent()
                    .get::<_, CrossChainMessage>(&StorageKey::Message(msg_id))
                {
                    messages.push_back(message);
                }
            }
        }

        Ok(messages)
    }

    /// Get protocol adapter details
    pub fn get_protocol_adapter(env: Env, adapter_id: u64) -> Result<ProtocolAdapter, String> {
        env.storage().persistent()
            .get(&StorageKey::ProtocolAdapter(adapter_id))
            .ok_or_else(|| "Adapter not found".to_string())
    }

    /// Get batched messages
    pub fn get_message_batch(env: Env, batch_id: u64) -> Result<Vec<u64>, String> {
        env.storage().persistent()
            .get(&StorageKey::MessageQueue(batch_id))
            .ok_or_else(|| "Batch not found".to_string())
    }

    /// Calculate gas cost for cross-chain message
    pub fn calculate_gas_cost(
        env: Env,
        destination_chain: u64,
        gas_limit: u64,
    ) -> Result<u64, String> {
        let gas_price: u64 = env.storage().persistent()
            .get(&StorageKey::GasPricePerChain(destination_chain))
            .unwrap_or(100u64);

        Ok(gas_price * gas_limit)
    }

    /// Get statistics
    pub fn get_stats(env: Env) -> Map<String, u64> {
        let mut stats: Map<String, u64> = Map::new(env);
        
        let total_messages: u64 = env.storage().persistent()
            .get(&StorageKey::TotalMessages)
            .unwrap_or(0u64);
        
        stats.set("total_messages".into_val(&env), total_messages);
        
        // Count by status
        let mut delivered = 0u64;
        let mut pending = 0u64;
        let mut failed = 0u64;
        
        for i in 0..total_messages {
            if let Ok(msg) = env.storage().persistent().get::<_, CrossChainMessage>(&StorageKey::Message(i)) {
                match msg.status {
                    MessageStatus::Delivered => delivered += 1,
                    MessageStatus::Pending | MessageStatus::InTransit => pending += 1,
                    MessageStatus::Failed => failed += 1,
                }
            }
        }
        
        stats.set("delivered_messages".into_val(&env), delivered);
        stats.set("pending_messages".into_val(&env), pending);
        stats.set("failed_messages".into_val(&env), failed);
        
        stats
    }

    // ========== Internal Helper Functions ==========

    fn get_admin(env: &Env) -> Result<Address, String> {
        // Simplified - in production, store and retrieve admin address
        Ok(Address::from_account(env.current_contract_address()))
    }

    fn update_adapter_stats(
        env: &Env,
        message_type: &MessageType,
        success: bool,
    ) -> Result<(), String> {
        // Find and update relevant adapter stats
        // Simplified implementation
        Ok(())
    }
}
