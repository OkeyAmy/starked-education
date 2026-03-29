// Smart Contract Wallet Implementation
// ERC-4337 Account Abstraction with Social Recovery and Multi-Sig

#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec, BytesN, Symbol, symbol_short};

#[contracttype]
#[derive(Clone)]
pub struct Guardian {
    pub address: Address,
    pub added_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct RecoveryRequest {
    pub recovery_id: BytesN<32>,
    pub new_owner: Address,
    pub approval_count: u32,
    pub threshold: u32,
    pub initiated_at: u64,
    pub executed: bool,
    pub cancelled: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct MultiSigTransaction {
    pub tx_id: BytesN<32>,
    pub to: Address,
    pub value: i128,
    pub data: BytesN<32>,
    pub approval_count: u32,
    pub threshold: u32,
    pub executed: bool,
    pub proposed_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct SessionKey {
    pub key_address: Address,
    pub spending_limit: i128,
    pub spent_amount: i128,
    pub valid_until: u64,
    pub revoked: bool,
}

#[contracttype]
pub enum DataKey {
    Owner,
    Nonce,
    Guardians,
    GuardianThreshold,
    RecoveryRequest(BytesN<32>),
    Signers,
    SignerThreshold,
    MultiSigTx(BytesN<32>),
    SessionKey(Address),
    Initialized,
}

#[contract]
pub struct SmartWallet;

#[contractimpl]
impl SmartWallet {
    /// Initialize the smart wallet
    pub fn initialize(env: Env, owner: Address) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("Already initialized");
        }

        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::Nonce, &0u64);
        env.storage().instance().set(&DataKey::Initialized, &true);

        env.events().publish((symbol_short!("init"),), owner);
    }

    /// Get wallet owner
    pub fn get_owner(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Owner)
            .unwrap_or_else(|| panic!("Not initialized"))
    }

    /// Get and increment nonce
    pub fn get_nonce(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::Nonce)
            .unwrap_or(0)
    }

    /// Execute transaction
    pub fn execute(env: Env, to: Address, value: i128, data: BytesN<32>) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();

        // Increment nonce
        let nonce: u64 = Self::get_nonce(env.clone());
        env.storage().instance().set(&DataKey::Nonce, &(nonce + 1));

        // Execute transaction logic here
        env.events().publish(
            (symbol_short!("execute"),),
            (to.clone(), value, data),
        );
    }

    /// Execute batch transactions
    pub fn execute_batch(env: Env, destinations: Vec<Address>, values: Vec<i128>, data: Vec<BytesN<32>>) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();

        let len = destinations.len();
        if len != values.len() || len != data.len() {
            panic!("Array length mismatch");
        }

        // Increment nonce
        let nonce: u64 = Self::get_nonce(env.clone());
        env.storage().instance().set(&DataKey::Nonce, &(nonce + 1));

        // Execute batch transactions
        for i in 0..len {
            let to = destinations.get(i).unwrap();
            let value = values.get(i).unwrap();
            let tx_data = data.get(i).unwrap();

            env.events().publish(
                (symbol_short!("batch"),),
                (to, value, tx_data),
            );
        }
    }

    // ===== Social Recovery =====

    /// Setup social recovery
    pub fn setup_recovery(env: Env, guardians: Vec<Address>, threshold: u32) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();

        if guardians.len() < threshold {
            panic!("Threshold exceeds guardian count");
        }

        let guardian_list: Vec<Guardian> = guardians
            .iter()
            .map(|addr| Guardian {
                address: addr,
                added_at: env.ledger().timestamp(),
            })
            .collect();

        env.storage().instance().set(&DataKey::Guardians, &guardian_list);
        env.storage().instance().set(&DataKey::GuardianThreshold, &threshold);

        env.events().publish(
            (symbol_short!("recovery"),),
            (guardians, threshold),
        );
    }

    /// Initiate recovery
    pub fn initiate_recovery(env: Env, recovery_id: BytesN<32>, new_owner: Address, guardian: Address) {
        guardian.require_auth();

        let guardians: Vec<Guardian> = env.storage()
            .instance()
            .get(&DataKey::Guardians)
            .unwrap_or_else(|| panic!("Recovery not setup"));

        // Verify guardian
        let is_guardian = guardians.iter().any(|g| g.address == guardian);
        if !is_guardian {
            panic!("Not a guardian");
        }

        let threshold: u32 = env.storage().instance().get(&DataKey::GuardianThreshold).unwrap();

        let recovery = RecoveryRequest {
            recovery_id: recovery_id.clone(),
            new_owner: new_owner.clone(),
            approval_count: 1,
            threshold,
            initiated_at: env.ledger().timestamp(),
            executed: false,
            cancelled: false,
        };

        env.storage().instance().set(&DataKey::RecoveryRequest(recovery_id.clone()), &recovery);

        env.events().publish(
            (symbol_short!("rec_init"),),
            (recovery_id, new_owner),
        );
    }

    /// Support recovery
    pub fn support_recovery(env: Env, recovery_id: BytesN<32>, guardian: Address) {
        guardian.require_auth();

        let mut recovery: RecoveryRequest = env.storage()
            .instance()
            .get(&DataKey::RecoveryRequest(recovery_id.clone()))
            .unwrap_or_else(|| panic!("Recovery not found"));

        if recovery.executed || recovery.cancelled {
            panic!("Recovery already finalized");
        }

        recovery.approval_count += 1;

        env.storage().instance().set(&DataKey::RecoveryRequest(recovery_id.clone()), &recovery);

        env.events().publish(
            (symbol_short!("rec_supp"),),
            (recovery_id, recovery.approval_count),
        );
    }

    /// Execute recovery
    pub fn execute_recovery(env: Env, recovery_id: BytesN<32>) {
        let mut recovery: RecoveryRequest = env.storage()
            .instance()
            .get(&DataKey::RecoveryRequest(recovery_id.clone()))
            .unwrap_or_else(|| panic!("Recovery not found"));

        if recovery.approval_count < recovery.threshold {
            panic!("Insufficient approvals");
        }

        if recovery.executed {
            panic!("Already executed");
        }

        // Transfer ownership
        env.storage().instance().set(&DataKey::Owner, &recovery.new_owner);
        recovery.executed = true;

        env.storage().instance().set(&DataKey::RecoveryRequest(recovery_id.clone()), &recovery);

        env.events().publish(
            (symbol_short!("rec_exec"),),
            (recovery_id, recovery.new_owner),
        );
    }

    // ===== Multi-Signature =====

    /// Setup multi-sig
    pub fn setup_multisig(env: Env, signers: Vec<Address>, threshold: u32) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();

        if signers.len() < threshold {
            panic!("Threshold exceeds signer count");
        }

        env.storage().instance().set(&DataKey::Signers, &signers);
        env.storage().instance().set(&DataKey::SignerThreshold, &threshold);

        env.events().publish(
            (symbol_short!("multisig"),),
            (signers, threshold),
        );
    }

    /// Propose transaction
    pub fn propose_transaction(env: Env, tx_id: BytesN<32>, to: Address, value: i128, data: BytesN<32>, proposer: Address) {
        proposer.require_auth();

        let signers: Vec<Address> = env.storage()
            .instance()
            .get(&DataKey::Signers)
            .unwrap_or_else(|| panic!("Multi-sig not setup"));

        if !signers.iter().any(|s| *s == proposer) {
            panic!("Not a signer");
        }

        let threshold: u32 = env.storage().instance().get(&DataKey::SignerThreshold).unwrap();

        let tx = MultiSigTransaction {
            tx_id: tx_id.clone(),
            to: to.clone(),
            value,
            data,
            approval_count: 1,
            threshold,
            executed: false,
            proposed_at: env.ledger().timestamp(),
        };

        env.storage().instance().set(&DataKey::MultiSigTx(tx_id.clone()), &tx);

        env.events().publish(
            (symbol_short!("propose"),),
            (tx_id, to, value),
        );
    }

    /// Approve transaction
    pub fn approve_transaction(env: Env, tx_id: BytesN<32>, signer: Address) {
        signer.require_auth();

        let mut tx: MultiSigTransaction = env.storage()
            .instance()
            .get(&DataKey::MultiSigTx(tx_id.clone()))
            .unwrap_or_else(|| panic!("Transaction not found"));

        if tx.executed {
            panic!("Already executed");
        }

        tx.approval_count += 1;

        env.storage().instance().set(&DataKey::MultiSigTx(tx_id.clone()), &tx);

        env.events().publish(
            (symbol_short!("approve"),),
            (tx_id, tx.approval_count),
        );
    }

    /// Execute multi-sig transaction
    pub fn execute_multisig(env: Env, tx_id: BytesN<32>) {
        let mut tx: MultiSigTransaction = env.storage()
            .instance()
            .get(&DataKey::MultiSigTx(tx_id.clone()))
            .unwrap_or_else(|| panic!("Transaction not found"));

        if tx.approval_count < tx.threshold {
            panic!("Insufficient approvals");
        }

        if tx.executed {
            panic!("Already executed");
        }

        // Execute transaction
        tx.executed = true;
        env.storage().instance().set(&DataKey::MultiSigTx(tx_id.clone()), &tx);

        env.events().publish(
            (symbol_short!("exec_ms"),),
            (tx_id, tx.to, tx.value),
        );
    }

    // ===== Session Keys =====

    /// Create session key
    pub fn create_session_key(env: Env, key_address: Address, spending_limit: i128, valid_until: u64) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();

        let session_key = SessionKey {
            key_address: key_address.clone(),
            spending_limit,
            spent_amount: 0,
            valid_until,
            revoked: false,
        };

        env.storage().instance().set(&DataKey::SessionKey(key_address.clone()), &session_key);

        env.events().publish(
            (symbol_short!("sess_key"),),
            (key_address, spending_limit, valid_until),
        );
    }

    /// Revoke session key
    pub fn revoke_session_key(env: Env, key_address: Address) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();

        let mut session_key: SessionKey = env.storage()
            .instance()
            .get(&DataKey::SessionKey(key_address.clone()))
            .unwrap_or_else(|| panic!("Session key not found"));

        session_key.revoked = true;

        env.storage().instance().set(&DataKey::SessionKey(key_address.clone()), &session_key);

        env.events().publish(
            (symbol_short!("revoke"),),
            key_address,
        );
    }

    /// Execute with session key
    pub fn execute_with_session_key(env: Env, key_address: Address, to: Address, value: i128, data: BytesN<32>) {
        key_address.require_auth();

        let mut session_key: SessionKey = env.storage()
            .instance()
            .get(&DataKey::SessionKey(key_address.clone()))
            .unwrap_or_else(|| panic!("Session key not found"));

        if session_key.revoked {
            panic!("Session key revoked");
        }

        if env.ledger().timestamp() > session_key.valid_until {
            panic!("Session key expired");
        }

        if session_key.spent_amount + value > session_key.spending_limit {
            panic!("Spending limit exceeded");
        }

        session_key.spent_amount += value;
        env.storage().instance().set(&DataKey::SessionKey(key_address.clone()), &session_key);

        env.events().publish(
            (symbol_short!("sess_exec"),),
            (key_address, to, value),
        );
    }
}
