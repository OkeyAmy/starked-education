#![cfg(test)]

use crate::progress::{CourseProgressContract, CourseProgressContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

#[test]
fn test_progress_tracking() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CourseProgressContract);
    let client = CourseProgressContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let course_id = String::from_str(&env, "course-101");

    // Mock authentication
    env.mock_all_auths();

    // Record initial progress
    client.record_progress(&user, &course_id, &2, &10);

    // Verify progress stored
    let progress = client.get_progress(&user, &course_id).unwrap();
    assert_eq!(progress.lessons_completed, 2);
    assert_eq!(progress.total_lessons, 10);
    assert_eq!(progress.is_completed, false);

    // Update progress to completion
    client.record_progress(&user, &course_id, &10, &10);

    // Verify completion
    let completed_progress = client.get_progress(&user, &course_id).unwrap();
    assert_eq!(completed_progress.lessons_completed, 10);
    assert_eq!(completed_progress.is_completed, true);
    assert!(completed_progress.last_updated > 0);
}
