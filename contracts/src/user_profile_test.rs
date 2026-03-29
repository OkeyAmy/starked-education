#![cfg(test)]

use super::*;
use crate::user_profile::{
    Achievement, PrivacyLevel, UserProfileContract, UserProfileContractClient,
};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn create_test_env() -> (Env, UserProfileContractClient, Address, Address) {
    let env = Env::default();
    let contract_id = env.register_contract(None, UserProfileContract);
    let client = UserProfileContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let admin = Address::generate(&env);

    (env, client, user, admin)
}

#[test]
fn test_create_profile() {
    let (env, client, user, _admin) = create_test_env();

    let username = String::from_str(&env, "testuser");
    let email = Some(String::from_str(&env, "test@example.com"));
    let bio = Some(String::from_str(&env, "Test bio"));
    let avatar_url = Some(String::from_str(&env, "https://example.com/avatar.jpg"));
    let privacy_level = PrivacyLevel::Public;

    env.mock_all_auths();

    let profile = client.create_or_update_profile(
        &user,
        &username,
        &email,
        &bio,
        &avatar_url,
        &privacy_level,
    );

    assert_eq!(profile.owner, user);
    assert_eq!(profile.username, username);
    assert_eq!(profile.email, email);
    assert_eq!(profile.bio, bio);
    assert_eq!(profile.avatar_url, avatar_url);
    assert_eq!(profile.privacy_level, privacy_level);
    assert_eq!(profile.achievements.len(), 0);
}

#[test]
fn test_get_profile() {
    let (env, client, user, _admin) = create_test_env();

    let username = String::from_str(&env, "testuser");
    let email = Some(String::from_str(&env, "test@example.com"));
    let privacy_level = PrivacyLevel::Public;

    env.mock_all_auths();

    client.create_or_update_profile(&user, &username, &email, &None, &None, &privacy_level);

    let retrieved_profile = client.get_profile(&user);
    assert!(retrieved_profile.is_some());

    let profile = retrieved_profile.unwrap();
    assert_eq!(profile.username, username);
    assert_eq!(profile.email, email);
}

#[test]
fn test_get_profile_by_username() {
    let (env, client, user, _admin) = create_test_env();

    let username = String::from_str(&env, "uniqueuser");
    let privacy_level = PrivacyLevel::Public;

    env.mock_all_auths();

    client.create_or_update_profile(&user, &username, &None, &None, &None, &privacy_level);

    let retrieved_profile = client.get_profile_by_username(&username);
    assert!(retrieved_profile.is_some());

    let profile = retrieved_profile.unwrap();
    assert_eq!(profile.username, username);
    assert_eq!(profile.owner, user);
}

#[test]
fn test_add_achievement() {
    let (env, client, user, _admin) = create_test_env();

    let username = String::from_str(&env, "testuser");
    let privacy_level = PrivacyLevel::Public;

    env.mock_all_auths();

    client.create_or_update_profile(&user, &username, &None, &None, &None, &privacy_level);

    let achievement_title = String::from_str(&env, "First Achievement");
    let achievement_description = String::from_str(&env, "Completed first milestone");
    let badge_url = Some(String::from_str(&env, "https://example.com/badge.png"));

    let achievement_id = client.add_achievement(
        &user,
        &achievement_title,
        &achievement_description,
        &badge_url,
    );

    assert!(achievement_id > 0);

    let achievement = client.get_achievement(&achievement_id);
    assert!(achievement.is_some());

    let achievement = achievement.unwrap();
    assert_eq!(achievement.user, user);
    assert_eq!(achievement.title, achievement_title);
    assert_eq!(achievement.description, achievement_description);
    assert_eq!(achievement.badge_url, badge_url);
    assert_eq!(achievement.verified, false);
}

#[test]
fn test_get_user_achievements() {
    let (env, client, user, _admin) = create_test_env();

    let username = String::from_str(&env, "testuser");
    let privacy_level = PrivacyLevel::Public;

    env.mock_all_auths();

    client.create_or_update_profile(&user, &username, &None, &None, &None, &privacy_level);

    let achievement_title1 = String::from_str(&env, "First Achievement");
    let achievement_desc1 = String::from_str(&env, "First milestone");
    let achievement_title2 = String::from_str(&env, "Second Achievement");
    let achievement_desc2 = String::from_str(&env, "Second milestone");

    let id1 = client.add_achievement(&user, &achievement_title1, &achievement_desc1, &None);
    let id2 = client.add_achievement(&user, &achievement_title2, &achievement_desc2, &None);

    let achievements = client.get_user_achievements(&user);
    assert_eq!(achievements.len(), 2);

    // Check that both achievements are present
    let mut found_first = false;
    let mut found_second = false;

    for achievement in achievements.iter() {
        if achievement.id == id1 {
            found_first = true;
        }
        if achievement.id == id2 {
            found_second = true;
        }
    }

    assert!(found_first);
    assert!(found_second);
}

#[test]
fn test_verify_achievement() {
    let (env, client, user, admin) = create_test_env();

    let username = String::from_str(&env, "testuser");
    let privacy_level = PrivacyLevel::Public;

    env.mock_all_auths_multiple(&[&user, &admin]);

    client.create_or_update_profile(&user, &username, &None, &None, &None, &privacy_level);

    let achievement_title = String::from_str(&env, "Unverified Achievement");
    let achievement_desc = String::from_str(&env, "Needs verification");

    let achievement_id =
        client.add_achievement(&user, &achievement_title, &achievement_desc, &None);

    // Initially, achievement should not be verified
    let achievement = client.get_achievement(&achievement_id).unwrap();
    assert_eq!(achievement.verified, false);

    // Verify the achievement
    let result = client.verify_achievement(&admin, &achievement_id);
    assert_eq!(result, true);

    // Now the achievement should be verified
    let achievement = client.get_achievement(&achievement_id).unwrap();
    assert_eq!(achievement.verified, true);
}

#[test]
fn test_verify_profile_authenticity() {
    let (env, client, user, _admin) = create_test_env();

    let username = String::from_str(&env, "authenticuser");
    let privacy_level = PrivacyLevel::Public;

    env.mock_all_auths();

    client.create_or_update_profile(&user, &username, &None, &None, &None, &privacy_level);

    let is_authentic = client.verify_profile_authenticity(&user);
    assert_eq!(is_authentic, true);

    // Test with non-existent user
    let fake_user = Address::generate(&env);
    let is_fake_authentic = client.verify_profile_authenticity(&fake_user);
    assert_eq!(is_fake_authentic, false);
}

#[test]
fn test_update_privacy_level() {
    let (env, client, user, _admin) = create_test_env();

    let username = String::from_str(&env, "privacyuser");
    let initial_privacy = PrivacyLevel::Public;

    env.mock_all_auths();

    client.create_or_update_profile(&user, &username, &None, &None, &None, &initial_privacy);

    // Change privacy level to Private
    let result = client.update_privacy_level(&user, &PrivacyLevel::Private);
    assert_eq!(result, true);

    let profile = client.get_profile(&user).unwrap();
    assert_eq!(profile.privacy_level, PrivacyLevel::Private);
}

#[test]
fn test_profile_with_privacy_check() {
    let (env, client, user, requester) = create_test_env();

    let username = String::from_str(&env, "privateuser");
    let privacy_level = PrivacyLevel::Private;

    env.mock_all_auths();

    client.create_or_update_profile(&user, &username, &None, &None, &None, &privacy_level);

    // Requester should not be able to access private profile
    let profile = client.get_profile_with_privacy_check(&requester, &user);
    assert!(profile.is_none());

    // Owner should be able to access own profile
    let profile = client.get_profile_with_privacy_check(&user, &user);
    assert!(profile.is_some());
}

#[test]
fn test_username_uniqueness() {
    let (env, client, user1, _admin) = create_test_env();
    let user2 = Address::generate(&env);

    let username = String::from_str(&env, "uniqueusername");
    let privacy_level = PrivacyLevel::Public;

    env.mock_all_auths();

    // First user creates profile with username
    client.create_or_update_profile(&user1, &username, &None, &None, &None, &privacy_level);

    // Second user tries to use same username - should panic
    let result = std::panic::catch_unwind(|| {
        env.mock_all_auths();
        client.create_or_update_profile(&user2, &username, &None, &None, &None, &privacy_level);
    });

    assert!(result.is_err());
}
