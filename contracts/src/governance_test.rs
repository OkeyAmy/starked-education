#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env, String};

use crate::governance::{
    EligibilityCriteria, Governance, GovernanceDataKey, ProposalStatus, ScholarshipProposal,
};

// ── helpers ──────────────────────────────────────────────────────────────────

fn setup(env: &Env) -> (Address, Address, Address) {
    let proposer = Address::generate(env);
    let student_a = Address::generate(env); // eligible
    let student_b = Address::generate(env); // ineligible
    (proposer, student_a, student_b)
}

fn eligibility(env: &Env) -> EligibilityCriteria {
    EligibilityCriteria {
        min_credentials: 3,
        field_of_study: String::from_str(env, "CS"),
    }
}

/// Seed the treasury so scholarship funds can be reserved.
fn fund_treasury(env: &Env, amount: i128) {
    env.storage()
        .instance()
        .set(&GovernanceDataKey::TreasuryBalance, &amount);
}

/// Advance ledger time by `secs` seconds.
fn advance(env: &Env, secs: u64) {
    env.ledger().with_mut(|l| l.timestamp += secs);
}

// ── tests ─────────────────────────────────────────────────────────────────────

/// 1. Create a scholarship proposal and verify it is stored correctly.
#[test]
fn test_create_scholarship_proposal() {
    let env = Env::default();
    env.mock_all_auths();
    let (proposer, _, _) = setup(&env);
    fund_treasury(&env, 2000);

    let pid = Governance::create_scholarship_proposal(
        env.clone(),
        proposer,
        String::from_str(&env, "CS Scholarship"),
        String::from_str(&env, "Fund CS students"),
        /* voting_period */ 3600,
        /* quorum */ 10,
        /* total_amount */ 1000,
        /* per_recipient */ 250,
        /* max_recipients */ 4,
        eligibility(&env),
        /* application_window */ 86400,
    );

    assert_eq!(pid, 1);
    let s: ScholarshipProposal = Governance::get_scholarship(&env, pid);
    assert_eq!(s.total_amount, 1000);
    assert_eq!(s.per_recipient, 250);
    assert_eq!(s.max_recipients, 4);
    assert_eq!(s.disbursed_count, 0);
    // Treasury reduced by reserved amount
    let tb: i128 = env
        .storage()
        .instance()
        .get(&GovernanceDataKey::TreasuryBalance)
        .unwrap_or(0);
    assert_eq!(tb, 1000); // 2000 - 1000
}

/// 2. Full happy path: vote → execute → apply → disburse.
#[test]
fn test_scholarship_full_flow() {
    let env = Env::default();
    env.mock_all_auths();
    let (proposer, student_a, _) = setup(&env);
    fund_treasury(&env, 2000);

    let pid = Governance::create_scholarship_proposal(
        env.clone(),
        proposer,
        String::from_str(&env, "CS Scholarship"),
        String::from_str(&env, "Fund CS students"),
        3600,
        10,
        1000,
        250,
        4,
        eligibility(&env),
        86400,
    );

    // Vote for the proposal
    Governance::cast_vote(env.clone(), student_a.clone(), pid, 1, 20);

    // Advance past voting period
    advance(&env, 3601);

    // First call: moves Active → Queued
    Governance::execute_proposal(env.clone(), pid, 86400);
    let p: crate::governance::Proposal = env
        .storage()
        .instance()
        .get(&GovernanceDataKey::Proposal(pid))
        .unwrap();
    assert_eq!(p.status, ProposalStatus::Queued);

    // Advance past timelock (default 1 day)
    advance(&env, 86401);

    // Second call: moves Queued → Executed, opens application window
    Governance::execute_proposal(env.clone(), pid, 86400);
    let p2: crate::governance::Proposal = env
        .storage()
        .instance()
        .get(&GovernanceDataKey::Proposal(pid))
        .unwrap();
    assert_eq!(p2.status, ProposalStatus::Executed);

    // Give student_a 3 credentials (meets min_credentials = 3)
    Governance::set_student_credentials(env.clone(), student_a.clone(), 3);

    // Eligible student applies
    Governance::apply_for_scholarship(env.clone(), student_a.clone(), pid);

    let s = Governance::get_scholarship(&env, pid);
    assert_eq!(s.disbursed_count, 1);

    let record = Governance::get_scholarship_record(&env, pid, 0);
    assert_eq!(record.recipient, student_a);
    assert_eq!(record.amount, 250);
}

/// 3. Ineligible student (insufficient credentials) is rejected.
#[test]
#[should_panic(expected = "Insufficient credentials")]
fn test_ineligible_student_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (proposer, _, student_b) = setup(&env);
    fund_treasury(&env, 2000);

    let pid = Governance::create_scholarship_proposal(
        env.clone(),
        proposer,
        String::from_str(&env, "CS Scholarship"),
        String::from_str(&env, "Fund CS students"),
        3600,
        10,
        1000,
        250,
        4,
        eligibility(&env),
        86400,
    );

    Governance::cast_vote(env.clone(), student_b.clone(), pid, 1, 20);
    advance(&env, 3601);
    Governance::execute_proposal(env.clone(), pid, 86400);
    advance(&env, 86401);
    Governance::execute_proposal(env.clone(), pid, 86400);

    // student_b has only 1 credential — below threshold
    Governance::set_student_credentials(env.clone(), student_b.clone(), 1);
    Governance::apply_for_scholarship(env.clone(), student_b.clone(), pid);
}

/// 4. Unclaimed funds are returned to treasury after application window closes.
#[test]
fn test_unclaimed_funds_returned_to_treasury() {
    let env = Env::default();
    env.mock_all_auths();
    let (proposer, student_a, _) = setup(&env);
    fund_treasury(&env, 2000);

    let pid = Governance::create_scholarship_proposal(
        env.clone(),
        proposer,
        String::from_str(&env, "CS Scholarship"),
        String::from_str(&env, "Fund CS students"),
        3600,
        10,
        1000,
        250,
        4,
        eligibility(&env),
        86400,
    );

    Governance::cast_vote(env.clone(), student_a.clone(), pid, 1, 20);
    advance(&env, 3601);
    Governance::execute_proposal(env.clone(), pid, 86400);
    advance(&env, 86401);
    Governance::execute_proposal(env.clone(), pid, 86400);

    // Only 1 of 4 slots filled
    Governance::set_student_credentials(env.clone(), student_a.clone(), 3);
    Governance::apply_for_scholarship(env.clone(), student_a.clone(), pid);

    let tb_before: i128 = env
        .storage()
        .instance()
        .get(&GovernanceDataKey::TreasuryBalance)
        .unwrap_or(0);

    // Advance past application deadline
    advance(&env, 86401);
    Governance::return_unclaimed_scholarship_funds(env.clone(), pid);

    let tb_after: i128 = env
        .storage()
        .instance()
        .get(&GovernanceDataKey::TreasuryBalance)
        .unwrap_or(0);

    // 3 unused slots × 250 = 750 returned
    assert_eq!(tb_after - tb_before, 750);

    let s = Governance::get_scholarship(&env, pid);
    assert!(s.returned_to_treasury);
}

/// 5. Defeated proposal returns its reserved funds immediately.
#[test]
fn test_defeated_proposal_returns_funds() {
    let env = Env::default();
    env.mock_all_auths();
    let (proposer, student_a, _) = setup(&env);
    fund_treasury(&env, 2000);

    let pid = Governance::create_scholarship_proposal(
        env.clone(),
        proposer,
        String::from_str(&env, "CS Scholarship"),
        String::from_str(&env, "Fund CS students"),
        3600,
        100, // high quorum — will not be met
        1000,
        250,
        4,
        eligibility(&env),
        86400,
    );

    // Vote with power below quorum
    Governance::cast_vote(env.clone(), student_a.clone(), pid, 1, 5);
    advance(&env, 3601);

    let tb_before: i128 = env
        .storage()
        .instance()
        .get(&GovernanceDataKey::TreasuryBalance)
        .unwrap_or(0);

    Governance::execute_proposal(env.clone(), pid, 86400);

    let tb_after: i128 = env
        .storage()
        .instance()
        .get(&GovernanceDataKey::TreasuryBalance)
        .unwrap_or(0);

    assert_eq!(tb_after - tb_before, 1000); // full amount returned
}

/// 6. Duplicate application is rejected.
#[test]
#[should_panic(expected = "Already applied")]
fn test_duplicate_application_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (proposer, student_a, _) = setup(&env);
    fund_treasury(&env, 2000);

    let pid = Governance::create_scholarship_proposal(
        env.clone(),
        proposer,
        String::from_str(&env, "CS Scholarship"),
        String::from_str(&env, "Fund CS students"),
        3600,
        10,
        1000,
        250,
        4,
        eligibility(&env),
        86400,
    );

    Governance::cast_vote(env.clone(), student_a.clone(), pid, 1, 20);
    advance(&env, 3601);
    Governance::execute_proposal(env.clone(), pid, 86400);
    advance(&env, 86401);
    Governance::execute_proposal(env.clone(), pid, 86400);

    Governance::set_student_credentials(env.clone(), student_a.clone(), 3);
    Governance::apply_for_scholarship(env.clone(), student_a.clone(), pid);
    Governance::apply_for_scholarship(env.clone(), student_a.clone(), pid); // should panic
}
