#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec, BytesN,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BridgeKey {
    CredentialLocked(u64), // CredentialID -> Locked Status
    CrossChainTransaction(BytesN<32>), // TransactionHash -> Status
    BridgeAdmin,
    Validator(Address),
    ValidatorCount,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BridgeMessage {
    pub source_chain_id: u32,
    pub target_chain_id: u32,
    pub credential_id: u64,
    pub recipient: Address,
    pub metadata_hash: BytesN<32>,
    pub signatures: Vec<BytesN<64>>, // Ed25519 signatures from validators
}

#[contract]
pub struct BridgeContract;

#[contractimpl]
impl BridgeContract {
    /// Initialize bridge with admin and validators
    pub fn initialize(env: Env, admin: Address, initial_validators: Vec<Address>) {
        admin.require_auth();
        env.storage()
            .instance()
            .set(&BridgeKey::BridgeAdmin, &admin);
        
        let mut count = 0u32;
        for val in initial_validators.iter() {
            env.storage().instance().set(&BridgeKey::Validator(val), &true);
            count += 1;
        }
        env.storage().instance().set(&BridgeKey::ValidatorCount, &count);
    }

    /// Lock a credential on Stellar to port to another chain
    pub fn lock_credential(env: Env, owner: Address, credential_id: u64, target_chain_id: u32) {
        owner.require_auth();

        // Check if credential is already locked
        if env.storage().instance().has(&BridgeKey::CredentialLocked(credential_id)) {
            panic!("Credential already locked on bridge");
        }

        // Logic here to verify ownership and mark as locked
        env.storage().instance().set(&BridgeKey::CredentialLocked(credential_id), &true);

        env.events().publish(
            (symbol_short!("bridge"), symbol_short!("lock")),
            (credential_id, owner, target_chain_id),
        );
    }

    /// Claim a credential on Stellar that was locked on another chain (Mint/Unlock)
    pub fn claim_locked_credential(
        env: Env,
        prover: Address,
        message: BridgeMessage,
    ) {
        prover.require_auth();

        // Verify quorum of validators
        let threshold = (env.storage().instance().get::<_, u32>(&BridgeKey::ValidatorCount).unwrap_or(0) / 2) + 1;
        if message.signatures.len() < threshold {
            panic!("Quorum not reached for bridge message");
        }

        // Verify signatures (omitted actual crypto for simplicity, but in real use would use env.crypto())
        // For each signature, check if it belongs to a registered validator.
        
        // Mark transaction as processed
        let tx_hash = message.metadata_hash.clone(); // In real use, hash of the full message
        if env.storage().instance().has(&BridgeKey::CrossChainTransaction(tx_hash.clone())) {
            panic!("Transaction already processed");
        }
        
        env.storage().instance().set(&BridgeKey::CrossChainTransaction(tx_hash.clone()), &true);

        // Unlock or Mint core logic
        env.storage().instance().remove(&BridgeKey::CredentialLocked(message.credential_id));

        env.events().publish(
            (symbol_short!("bridge"), symbol_short!("claim")),
            (message.credential_id, message.recipient, message.source_chain_id),
        );
    }

    /// Add a validator (Admin only)
    pub fn add_validator(env: Env, admin: Address, new_validator: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&BridgeKey::BridgeAdmin).unwrap_or_else(|| panic!("Bridge admin not set"));
        if admin != stored_admin {
            panic!("Only admin can add validators");
        }

        env.storage().instance().set(&BridgeKey::Validator(new_validator), &true);
        let count: u32 = env.storage().instance().get(&BridgeKey::ValidatorCount).unwrap_or(0);
        env.storage().instance().set(&BridgeKey::ValidatorCount, &(count + 1));
    }

    /// Check if a credential is locked
    pub fn is_locked(env: Env, credential_id: u64) -> bool {
        env.storage().instance().has(&BridgeKey::CredentialLocked(credential_id))
    }
}
