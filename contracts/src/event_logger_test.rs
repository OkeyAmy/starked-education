#![cfg(test)]

use crate::eventLogger::{EventLoggerContract, EventLoggerContractClient, EventType};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String, Vec,
};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EventLoggerContract);
    let client = EventLoggerContractClient::new(&env, &contract_id);

    // Initialize contract
    client.initialize();

    // Verify initial state
    assert_eq!(client.get_event_count(), 0);
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn test_double_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EventLoggerContract);
    let client = EventLoggerContractClient::new(&env, &contract_id);

    // Initialize twice should panic
    client.initialize();
    client.initialize();
}

#[test]
fn test_log_course_completion() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EventLoggerContract);
    let client = EventLoggerContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let course_id = String::from_str(&env, "course-101");
    let metadata = String::from_str(&env, "{\"grade\": \"A+\", \"duration\": \"40 hours\"}");

    // Initialize contract
    client.initialize();

    // Log course completion
    let event_id = client.log_course_completion(&user, &course_id, &metadata);

    // Verify event was created
    assert_eq!(event_id, 1);
    assert_eq!(client.get_event_count(), 1);

    // Get event and verify details
    let event = client.get_event(&event_id).unwrap();
    assert_eq!(event.id, 1);
    assert_eq!(event.event_type, EventType::CourseCompletion);
    assert_eq!(event.user, user);
    assert_eq!(event.course_id.unwrap(), course_id);
    assert_eq!(event.metadata, metadata);
    assert!(event.timestamp > 0);
}

#[test]
fn test_log_credential_issuance() {
    let env = Env::default();
    // Don't mock auth for credential issuance (admin-only)
    // env.mock_all_auths();

    let contract_id = env.register_contract(None, EventLoggerContract);
    let client = EventLoggerContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let course_id = String::from_str(&env, "course-101");
    let metadata = String::from_str(
        &env,
        "{\"issuer\": \"StarkEd Academy\", \"valid_until\": \"2027-12-31\"}",
    );

    // Initialize contract
    client.initialize();

    // Log credential issuance
    let credential_id = 12345u64;
    let event_id = client.log_credential_issuance(&user, &credential_id, &course_id, &metadata);

    // Verify event was created
    assert_eq!(event_id, 1);
    assert_eq!(client.get_event_count(), 1);

    // Get event and verify details
    let event = client.get_event(&event_id).unwrap();
    assert_eq!(event.id, 1);
    assert_eq!(event.event_type, EventType::CredentialIssuance);
    assert_eq!(event.user, user);
    assert_eq!(event.credential_id.unwrap(), credential_id);
    assert_eq!(event.course_id.unwrap(), course_id);
    assert_eq!(event.metadata, metadata);
}

#[test]
fn test_log_user_achievement() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EventLoggerContract);
    let client = EventLoggerContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let achievement_type = String::from_str(&env, "first_course_completed");
    let metadata = String::from_str(&env, "{\"badge_url\": \"ipfs://Qm...\", \"points\": 100}");

    // Initialize contract
    client.initialize();

    // Log user achievement
    let event_id = client.log_user_achievement(&user, &achievement_type, &metadata);

    // Verify event was created
    assert_eq!(event_id, 1);
    assert_eq!(client.get_event_count(), 1);

    // Get event and verify details
    let event = client.get_event(&event_id).unwrap();
    assert_eq!(event.id, 1);
    assert_eq!(event.event_type, EventType::UserAchievement);
    assert_eq!(event.user, user);
    assert_eq!(event.achievement_type.unwrap(), achievement_type);
    assert_eq!(event.metadata, metadata);
}

#[test]
fn test_log_profile_update() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EventLoggerContract);
    let client = EventLoggerContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let metadata = String::from_str(
        &env,
        "{\"name\": \"John Doe\", \"bio\": \"Learning blockchain\"}",
    );

    // Initialize contract
    client.initialize();

    // Log profile update
    let event_id = client.log_profile_update(&user, &metadata);

    // Verify event was created
    assert_eq!(event_id, 1);
    assert_eq!(client.get_event_count(), 1);

    // Get event and verify details
    let event = client.get_event(&event_id).unwrap();
    assert_eq!(event.id, 1);
    assert_eq!(event.event_type, EventType::ProfileUpdate);
    assert_eq!(event.user, user);
    assert_eq!(event.metadata, metadata);
}

#[test]
fn test_log_course_enrollment() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EventLoggerContract);
    let client = EventLoggerContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let course_id = String::from_str(&env, "course-202");
    let metadata = String::from_str(
        &env,
        "{\"enrollment_date\": \"2026-02-20\", \"price_paid\": \"50\"}",
    );

    // Initialize contract
    client.initialize();

    // Log course enrollment
    let event_id = client.log_course_enrollment(&user, &course_id, &metadata);

    // Verify event was created
    assert_eq!(event_id, 1);
    assert_eq!(client.get_event_count(), 1);

    // Get event and verify details
    let event = client.get_event(&event_id).unwrap();
    assert_eq!(event.id, 1);
    assert_eq!(event.event_type, EventType::CourseEnrollment);
    assert_eq!(event.user, user);
    assert_eq!(event.course_id.unwrap(), course_id);
    assert_eq!(event.metadata, metadata);
}

#[test]
fn test_get_user_events() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EventLoggerContract);
    let client = EventLoggerContractClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let course_id1 = String::from_str(&env, "course-101");
    let course_id2 = String::from_str(&env, "course-202");
    let metadata = String::from_str(&env, "{}");

    // Initialize contract
    client.initialize();

    // Log multiple events for different users
    client.log_course_completion(&user1, &course_id1, &metadata);
    client.log_course_completion(&user2, &course_id2, &metadata);
    client.log_course_completion(&user1, &course_id2, &metadata);

    // Get user1's events
    let user1_events = client.get_user_events(&user1);
    assert_eq!(user1_events.len(), 2);

    // Get user2's events
    let user2_events = client.get_user_events(&user2);
    assert_eq!(user2_events.len(), 1);

    // Verify event details
    let first_event = &user1_events.get(0).unwrap();
    assert_eq!(first_event.user, user1);
    assert_eq!(first_event.course_id.as_ref().unwrap(), &course_id1);
}

#[test]
fn test_get_events_by_type() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EventLoggerContract);
    let client = EventLoggerContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let course_id = String::from_str(&env, "course-101");
    let metadata = String::from_str(&env, "{}");

    // Initialize contract
    client.initialize();

    // Log different types of events
    client.log_course_completion(&user, &course_id, &metadata);
    client.log_course_enrollment(&user, &course_id, &metadata);
    client.log_course_completion(&user, &course_id, &metadata);

    // Get course completion events
    let completion_events = client.get_events_by_type(&EventType::CourseCompletion);
    assert_eq!(completion_events.len(), 2);

    // Get enrollment events
    let enrollment_events = client.get_events_by_type(&EventType::CourseEnrollment);
    assert_eq!(enrollment_events.len(), 1);

    // Verify event types
    for event in completion_events.iter() {
        assert_eq!(event.event_type, EventType::CourseCompletion);
    }
}

#[test]
fn test_get_recent_events() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EventLoggerContract);
    let client = EventLoggerContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let course_id = String::from_str(&env, "course-101");
    let metadata = String::from_str(&env, "{}");

    // Initialize contract
    client.initialize();

    // Log multiple events
    client.log_course_completion(&user, &course_id, &metadata); // event 1
    client.log_course_completion(&user, &course_id, &metadata); // event 2
    client.log_course_completion(&user, &course_id, &metadata); // event 3
    client.log_course_completion(&user, &course_id, &metadata); // event 4

    // Get recent events (limit 2)
    let recent_events = client.get_recent_events(&2, &0);
    assert_eq!(recent_events.len(), 2);

    // Should get events 4 and 3 (most recent first)
    assert_eq!(recent_events.get(0).unwrap().id, 4);
    assert_eq!(recent_events.get(1).unwrap().id, 3);

    // Get recent events with offset
    let offset_events = client.get_recent_events(&2, &2);
    assert_eq!(offset_events.len(), 2);

    // Should get events 2 and 1
    assert_eq!(offset_events.get(0).unwrap().id, 2);
    assert_eq!(offset_events.get(1).unwrap().id, 1);
}

#[test]
fn test_event_persistence() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EventLoggerContract);
    let client = EventLoggerContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let course_id = String::from_str(&env, "course-101");
    let metadata = String::from_str(&env, "{}");

    // Initialize contract
    client.initialize();

    // Log an event
    let event_id = client.log_course_completion(&user, &course_id, &metadata);

    // Verify event exists
    assert!(client.get_event(&event_id).is_some());

    // Get event by ID
    let event = client.get_event(&event_id).unwrap();
    assert_eq!(event.id, event_id);
    assert_eq!(event.user, user);
    assert_eq!(event.course_id.unwrap(), course_id);
}
