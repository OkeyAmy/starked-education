use soroban_sdk::{contracttype, Address, Env, String, Vec, Symbol, Map};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalStatus {
    Active,
    Succeeded,
    Defeated,
    Queued,
    Executed,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub title: String,
    pub description: String,
    pub start_time: u64,
    pub end_time: u64,
    pub execution_time: u64,
    pub for_votes: i128,
    pub against_votes: i128,
    pub abstain_votes: i128,
    pub status: ProposalStatus,
    pub quorum: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VoteRecord {
    pub voter: Address,
    pub proposal_id: u64,
    pub support: u32, // 0: Against, 1: For, 2: Abstain
    pub voting_power: i128,
}

#[contracttype]
pub enum GovernanceDataKey {
    Proposal(u64),
    ProposalCount,
    Vote(u64, Address),
    GovernanceToken,
    QuorumThreshold,
    VotingPeriod,
    TimelockDelay,
    ReputationMultiplier,
    Delegate(Address),
    TreasuryBalance,
}

pub struct Governance;

impl Governance {
    pub fn get_voting_power(env: &Env, voter: Address, token: Address, reputation: u64) -> i128 {
        let token_client = soroban_sdk::token::Client::new(env, &token);
        let token_balance = token_client.balance(&voter);
        
        // Quadratic voting: sqrt(balance)
        let sqrt_balance = Self::integer_sqrt(token_balance);
        
        // Reputation-based bonus
        let reputation_power = reputation as i128;
        
        sqrt_balance + reputation_power
    }

    pub fn create_proposal(
        env: Env,
        proposer: Address,
        title: String,
        description: String,
        voting_period: u64,
        quorum: i128,
    ) -> u64 {
        proposer.require_auth();
        
        let count: u64 = env.storage().instance()
            .get(&GovernanceDataKey::ProposalCount)
            .unwrap_or(0);
        let id = count + 1;
        
        let start_time = env.ledger().timestamp();
        let end_time = start_time + voting_period;
        
        let proposal = Proposal {
            id,
            proposer,
            title,
            description,
            start_time,
            end_time,
            execution_time: 0,
            for_votes: 0,
            against_votes: 0,
            abstain_votes: 0,
            status: ProposalStatus::Active,
            quorum,
        };
        
        env.storage().instance().set(&GovernanceDataKey::Proposal(id), &proposal);
        env.storage().instance().set(&GovernanceDataKey::ProposalCount, &id);
        
        id
    }

    pub fn cast_vote(
        env: Env,
        voter: Address,
        proposal_id: u64,
        support: u32,
        voting_power: i128,
    ) {
        voter.require_auth();
        
        let mut proposal: Proposal = env.storage().instance()
            .get(&GovernanceDataKey::Proposal(proposal_id))
            .expect("Proposal not found");
        
        if env.ledger().timestamp() > proposal.end_time {
            panic!("Voting period ended");
        }

        if env.storage().instance().has(&GovernanceDataKey::Vote(proposal_id, voter.clone())) {
            panic!("Already voted");
        }

        match support {
            0 => proposal.against_votes += voting_power,
            1 => proposal.for_votes += voting_power,
            2 => proposal.abstain_votes += voting_power,
            _ => panic!("Invalid support option"),
        }

        env.storage().instance().set(&GovernanceDataKey::Proposal(proposal_id), &proposal);
        env.storage().instance().set(&GovernanceDataKey::Vote(proposal_id, voter.clone()), &support);
    }

    pub fn execute_proposal(env: Env, proposal_id: u64) {
        let mut proposal: Proposal = env.storage().instance()
            .get(&GovernanceDataKey::Proposal(proposal_id))
            .expect("Proposal not found");
        
        if env.ledger().timestamp() < proposal.end_time {
            panic!("Voting period not ended");
        }

        if proposal.for_votes < proposal.quorum {
            proposal.status = ProposalStatus::Defeated;
        } else if proposal.for_votes > proposal.against_votes {
            // Check timelock
            let timelock_delay: u64 = env.storage().instance()
                .get(&GovernanceDataKey::TimelockDelay)
                .unwrap_or(86400); // 1 day default

            if proposal.status == ProposalStatus::Active {
                proposal.status = ProposalStatus::Queued;
                proposal.execution_time = env.ledger().timestamp() + timelock_delay;
            } else if proposal.status == ProposalStatus::Queued {
                if env.ledger().timestamp() >= proposal.execution_time {
                    proposal.status = ProposalStatus::Executed;
                    // Actual execution logic would be here
                    // e.g., calling another contract or transferring funds from treasury
                } else {
                    panic!("Timelock period not ended");
                }
            }
        } else {
            proposal.status = ProposalStatus::Defeated;
        }

        env.storage().instance().set(&GovernanceDataKey::Proposal(proposal_id), &proposal);
    }

    pub fn delegate(env: Env, from: Address, to: Address) {
        from.require_auth();
        env.storage().instance().set(&GovernanceDataKey::Delegate(from), &to);
    }

    pub fn get_delegate(env: &Env, voter: Address) -> Address {
        env.storage().instance()
            .get(&GovernanceDataKey::Delegate(voter.clone()))
            .unwrap_or(voter)
    }

    pub fn deposit_to_treasury(env: Env, amount: i128) {
        let current: i128 = env.storage().instance()
            .get(&GovernanceDataKey::TreasuryBalance)
            .unwrap_or(0);
        env.storage().instance().set(&GovernanceDataKey::TreasuryBalance, &(current + amount));
    }

    pub fn withdraw_from_treasury(env: Env, amount: i128, recipient: Address) {
        // This should only be called by the contract itself during proposal execution
        let current: i128 = env.storage().instance()
            .get(&GovernanceDataKey::TreasuryBalance)
            .unwrap_or(0);
        if current < amount {
            panic!("Insufficient treasury funds");
        }
        env.storage().instance().set(&GovernanceDataKey::TreasuryBalance, &(current - amount));
        // Transfer logic here
    }

    fn integer_sqrt(n: i128) -> i128 {
        if n < 0 {
            return 0;
        }
        if n < 2 {
            return n;
        }
        let mut x = n / 2;
        let mut y = (x + n / x) / 2;
        while y < x {
            x = y;
            y = (x + n / x) / 2;
        }
        x
    }
}
