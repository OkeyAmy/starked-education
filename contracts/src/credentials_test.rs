#![cfg(test)]

use crate::credentials::{
    get_credential, get_credential_count, get_user_credentials, issue_credential,
    revoke_credential, verify_credential, CredentialKey,
};
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

#[test]
fn test_issue_and_verify_credential() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let cred_id = issue_credential(
        &env,
        admin.clone(),
        recipient.clone(),
        String::from_str(&env, "Rust on Stellar"),
        String::from_str(&env, "Completed Soroban basics"),
        String::from_str(&env, "course-001"),
        String::from_str(&env, "ipfs://Qm..."),
    );

    assert_eq!(cred_id, 1);
    assert_eq!(get_credential_count(&env), 1);

    let cred = get_credential(&env, cred_id);
    assert_eq!(cred.recipient, recipient);
    assert!(!cred.is_revoked);

    assert!(verify_credential(&env, cred_id));

    // Revoke
    revoke_credential(&env, cred_id, admin.clone());
    let revoked_cred = get_credential(&env, cred_id);
    assert!(revoked_cred.is_revoked);

    // Verify should now return false
    assert!(!verify_credential(&env, cred_id));

    // User credential list
    let user_creds: Vec<u64> = get_user_credentials(&env, recipient);
    assert_eq!(user_creds.len(), 1);
    assert_eq!(user_creds.get(0).unwrap(), 1);
}
