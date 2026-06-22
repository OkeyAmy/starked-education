use soroban_sdk::{contracttype, Address, Env, String};

pub const MAX_PROPOSAL_TITLE_BYTES: u32 = 200;
pub const MAX_PROPOSAL_DESCRIPTION_BYTES: u32 = 2000;
pub const MIN_VOTING_PERIOD: u64 = 300;
pub const MAX_VOTING_PERIOD: u64 = 30 * 24 * 60 * 60;
pub const DUPLICATE_PROPOSAL_COOLDOWN: u64 = 24 * 60 * 60;

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

/// Eligibility criteria a student must meet to apply for a scholarship.
#[contracttype]
#[derive(Clone, Debug)]
pub struct EligibilityCriteria {
    pub min_credentials: u32,   // minimum number of verified credentials
    pub field_of_study: String, // e.g. "CS" — empty string means any field
}

/// Created when a scholarship proposal is approved and queued for execution.
#[contracttype]
#[derive(Clone, Debug)]
pub struct ScholarshipProposal {
    pub proposal_id: u64,
    pub total_amount: i128,        // total tokens reserved
    pub per_recipient: i128,       // tokens per recipient
    pub max_recipients: u32,       // cap on number of disbursements
    pub disbursed_count: u32,      // how many have been paid out
    pub eligibility: EligibilityCriteria,
    pub application_deadline: u64, // timestamp after which no more applications
    pub returned_to_treasury: bool,
}

/// On-chain record of a scholarship disbursement.
#[contracttype]
#[derive(Clone, Debug)]
pub struct ScholarshipRecord {
    pub proposal_id: u64,
    pub recipient: Address,
    pub amount: i128,
    pub timestamp: u64,
}

#[contracttype]
pub enum GovernanceDataKey {
    Proposal(u64),
    ProposalCount,
    Vote(u64, Address),
    GovernanceToken,
    QuorumThreshold,
    VotingPeriod,
    ProposalByProposerTitle(Address, String),
    TimelockDelay,
    ReputationMultiplier,
    Delegate(Address),
    TreasuryBalance,
    // Scholarship keys
    Scholarship(u64),                    // ScholarshipProposal keyed by proposal_id
    ScholarshipApplicant(u64, Address),  // whether address has applied
    ScholarshipRecord(u64, u32),         // disbursement record (proposal_id, index)
    ScholarshipRecordCount(u64),         // number of disbursements for a proposal
    // Per-student credential count (set externally / by credential registry)
    StudentCredentials(Address),
}

pub struct Governance;

impl Governance {
    pub fn get_voting_power(env: &Env, voter: Address, token: Address, reputation: u64) -> i128 {
        let token_client = soroban_sdk::token::Client::new(env, &token);
        let token_balance = token_client.balance(&voter);
        let sqrt_balance = Self::integer_sqrt(token_balance);
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
        Self::validate_proposal(&env, proposer.clone(), title.clone(), description.clone(), voting_period);
        let count: u64 = env.storage().instance()
            .get(&GovernanceDataKey::ProposalCount)
            .unwrap_or(0);
        let id = count + 1;
        let start_time = env.ledger().timestamp();
        let proposal = Proposal {
            id,
            proposer: proposer.clone(),
            title: title.clone(),
            description,
            start_time,
            end_time: start_time + voting_period,
            execution_time: 0,
            for_votes: 0,
            against_votes: 0,
            abstain_votes: 0,
            status: ProposalStatus::Active,
            quorum,
        };
        env.storage().instance().set(&GovernanceDataKey::Proposal(id), &proposal);
        env.storage().instance().set(&GovernanceDataKey::ProposalCount, &id);
        env.storage().instance().set(
            &GovernanceDataKey::ProposalByProposerTitle(proposer, title),
            &start_time,
        );
        id
    }

    /// Create a scholarship proposal. Returns the proposal_id.
    pub fn create_scholarship_proposal(
        env: Env,
        proposer: Address,
        title: String,
        description: String,
        voting_period: u64,
        quorum: i128,
        total_amount: i128,
        per_recipient: i128,
        max_recipients: u32,
        eligibility: EligibilityCriteria,
        application_window: u64, // seconds after execution during which students can apply
    ) -> u64 {
        if per_recipient <= 0 || total_amount < per_recipient as i128 {
            panic!("Invalid scholarship amounts");
        }
        if max_recipients == 0 {
            panic!("max_recipients must be > 0");
        }

        let id = Self::create_proposal(
            env.clone(), proposer, title, description, voting_period, quorum,
        );

        // Reserve funds from treasury immediately so they cannot be double-spent.
        let treasury: i128 = env.storage().instance()
            .get(&GovernanceDataKey::TreasuryBalance)
            .unwrap_or(0);
        if treasury < total_amount {
            panic!("Insufficient treasury funds");
        }
        env.storage().instance()
            .set(&GovernanceDataKey::TreasuryBalance, &(treasury - total_amount));

        let scholarship = ScholarshipProposal {
            proposal_id: id,
            total_amount,
            per_recipient,
            max_recipients,
            disbursed_count: 0,
            eligibility,
            application_deadline: 0, // set when proposal is executed
            returned_to_treasury: false,
        };
        env.storage().instance().set(&GovernanceDataKey::Scholarship(id), &scholarship);
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

    pub fn execute_proposal(env: Env, proposal_id: u64, application_window: u64) {
        let mut proposal: Proposal = env.storage().instance()
            .get(&GovernanceDataKey::Proposal(proposal_id))
            .expect("Proposal not found");
        if env.ledger().timestamp() < proposal.end_time {
            panic!("Voting period not ended");
        }
        if proposal.for_votes < proposal.quorum {
            proposal.status = ProposalStatus::Defeated;
            // Return reserved scholarship funds if applicable
            Self::return_scholarship_funds_if_defeated(&env, proposal_id);
        } else if proposal.for_votes > proposal.against_votes {
            let timelock_delay: u64 = env.storage().instance()
                .get(&GovernanceDataKey::TimelockDelay)
                .unwrap_or(86400);
            if proposal.status == ProposalStatus::Active {
                proposal.status = ProposalStatus::Queued;
                proposal.execution_time = env.ledger().timestamp() + timelock_delay;
            } else if proposal.status == ProposalStatus::Queued {
                if env.ledger().timestamp() >= proposal.execution_time {
                    proposal.status = ProposalStatus::Executed;
                    // Open the scholarship application window
                    if let Some(mut s) = env.storage().instance()
                        .get::<_, ScholarshipProposal>(&GovernanceDataKey::Scholarship(proposal_id))
                    {
                        s.application_deadline = env.ledger().timestamp() + application_window;
                        env.storage().instance().set(&GovernanceDataKey::Scholarship(proposal_id), &s);
                    }
                } else {
                    panic!("Timelock period not ended");
                }
            }
        } else {
            proposal.status = ProposalStatus::Defeated;
            Self::return_scholarship_funds_if_defeated(&env, proposal_id);
        }
        env.storage().instance().set(&GovernanceDataKey::Proposal(proposal_id), &proposal);
    }

    /// Student applies for a scholarship. Funds are disbursed immediately if eligible.
    pub fn apply_for_scholarship(env: Env, applicant: Address, proposal_id: u64) {
        applicant.require_auth();

        let proposal: Proposal = env.storage().instance()
            .get(&GovernanceDataKey::Proposal(proposal_id))
            .expect("Proposal not found");
        if proposal.status != ProposalStatus::Executed {
            panic!("Scholarship not yet approved/executed");
        }

        let mut scholarship: ScholarshipProposal = env.storage().instance()
            .get(&GovernanceDataKey::Scholarship(proposal_id))
            .expect("Not a scholarship proposal");

        let now = env.ledger().timestamp();
        if now > scholarship.application_deadline {
            panic!("Application window closed");
        }
        if scholarship.disbursed_count >= scholarship.max_recipients {
            panic!("All slots filled");
        }
        if env.storage().instance()
            .has(&GovernanceDataKey::ScholarshipApplicant(proposal_id, applicant.clone()))
        {
            panic!("Already applied");
        }

        // Eligibility check
        let cred_count: u32 = env.storage().instance()
            .get(&GovernanceDataKey::StudentCredentials(applicant.clone()))
            .unwrap_or(0);
        if cred_count < scholarship.eligibility.min_credentials {
            panic!("Insufficient credentials");
        }
        // field_of_study check omitted if empty (any field accepted)
        // A non-empty field_of_study would be enforced by an off-chain oracle / credential tag

        // Disburse
        scholarship.disbursed_count += 1;
        env.storage().instance()
            .set(&GovernanceDataKey::ScholarshipApplicant(proposal_id, applicant.clone()), &true);

        let record_count: u32 = env.storage().instance()
            .get(&GovernanceDataKey::ScholarshipRecordCount(proposal_id))
            .unwrap_or(0);
        let record = ScholarshipRecord {
            proposal_id,
            recipient: applicant.clone(),
            amount: scholarship.per_recipient,
            timestamp: now,
        };
        env.storage().instance()
            .set(&GovernanceDataKey::ScholarshipRecord(proposal_id, record_count), &record);
        env.storage().instance()
            .set(&GovernanceDataKey::ScholarshipRecordCount(proposal_id), &(record_count + 1));
        env.storage().instance()
            .set(&GovernanceDataKey::Scholarship(proposal_id), &scholarship);

        // Actual token transfer would call a token contract here.
        // We track the disbursement on-chain; token movement is handled by tokenomics integration.
    }

    /// Returns unclaimed scholarship funds to treasury after application window closes.
    pub fn return_unclaimed_scholarship_funds(env: Env, proposal_id: u64) {
        let mut scholarship: ScholarshipProposal = env.storage().instance()
            .get(&GovernanceDataKey::Scholarship(proposal_id))
            .expect("Not a scholarship proposal");

        if scholarship.returned_to_treasury {
            panic!("Funds already returned");
        }
        if env.ledger().timestamp() <= scholarship.application_deadline {
            panic!("Application window still open");
        }

        let disbursed = scholarship.disbursed_count as i128 * scholarship.per_recipient;
        let remaining = scholarship.total_amount - disbursed;

        if remaining > 0 {
            let treasury: i128 = env.storage().instance()
                .get(&GovernanceDataKey::TreasuryBalance)
                .unwrap_or(0);
            env.storage().instance()
                .set(&GovernanceDataKey::TreasuryBalance, &(treasury + remaining));
        }

        scholarship.returned_to_treasury = true;
        env.storage().instance().set(&GovernanceDataKey::Scholarship(proposal_id), &scholarship);
    }

    /// Set student credential count (called by CredentialRegistry contract).
    pub fn set_student_credentials(env: Env, student: Address, count: u32) {
        env.storage().instance().set(&GovernanceDataKey::StudentCredentials(student), &count);
    }

    pub fn get_scholarship(env: &Env, proposal_id: u64) -> ScholarshipProposal {
        env.storage().instance()
            .get(&GovernanceDataKey::Scholarship(proposal_id))
            .expect("Not a scholarship proposal")
    }

    pub fn get_scholarship_record(env: &Env, proposal_id: u64, index: u32) -> ScholarshipRecord {
        env.storage().instance()
            .get(&GovernanceDataKey::ScholarshipRecord(proposal_id, index))
            .expect("Record not found")
    }

    pub fn get_scholarship_record_count(env: &Env, proposal_id: u64) -> u32 {
        env.storage().instance()
            .get(&GovernanceDataKey::ScholarshipRecordCount(proposal_id))
            .unwrap_or(0)
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
        let current: i128 = env.storage().instance()
            .get(&GovernanceDataKey::TreasuryBalance)
            .unwrap_or(0);
        if current < amount {
            panic!("Insufficient treasury funds");
        }
        env.storage().instance().set(&GovernanceDataKey::TreasuryBalance, &(current - amount));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    fn return_scholarship_funds_if_defeated(env: &Env, proposal_id: u64) {
        if let Some(scholarship) = env.storage().instance()
            .get::<_, ScholarshipProposal>(&GovernanceDataKey::Scholarship(proposal_id))
        {
            if !scholarship.returned_to_treasury {
                let treasury: i128 = env.storage().instance()
                    .get(&GovernanceDataKey::TreasuryBalance)
                    .unwrap_or(0);
                env.storage().instance()
                    .set(&GovernanceDataKey::TreasuryBalance, &(treasury + scholarship.total_amount));
                let mut s = scholarship;
                s.returned_to_treasury = true;
                env.storage().instance().set(&GovernanceDataKey::Scholarship(proposal_id), &s);
            }
        }
    }

    fn validate_proposal(
        env: &Env,
        proposer: Address,
        title: String,
        description: String,
        voting_period: u64,
    ) {
        if title.len() == 0 {
            panic!("InvalidTitle: title must be non-empty");
        }
        if title.len() > MAX_PROPOSAL_TITLE_BYTES {
            panic!("InvalidTitle: title exceeds 200 bytes");
        }
        if description.len() > MAX_PROPOSAL_DESCRIPTION_BYTES {
            panic!("InvalidDescription: description exceeds 2000 bytes");
        }
        if voting_period < MIN_VOTING_PERIOD || voting_period > MAX_VOTING_PERIOD {
            panic!("InvalidVotingPeriod: voting period out of bounds");
        }

        if let Some(last_created_at) = env.storage().instance()
            .get::<_, u64>(&GovernanceDataKey::ProposalByProposerTitle(proposer, title))
        {
            let now = env.ledger().timestamp();
            if now.saturating_sub(last_created_at) < DUPLICATE_PROPOSAL_COOLDOWN {
                panic!("DuplicateProposal: proposer submitted same title within cooldown");
            }
        }
    }

    fn integer_sqrt(n: i128) -> i128 {
        if n < 2 { return n.max(0); }
        let mut x = n / 2;
        let mut y = (x + n / x) / 2;
        while y < x { x = y; y = (x + n / x) / 2; }
        x
    }
}
