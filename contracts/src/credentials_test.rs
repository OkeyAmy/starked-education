#![cfg(test)]

use crate::credentials::{
    add_multi_sig_signature, create_multi_sig_credential, get_credential, get_credential_count,
    get_multi_sig_credential, get_multi_sig_signatures, get_multi_sig_status,
    get_user_credentials, is_multi_sig_threshold_met, issue_credential, revoke_credential,
    verify_credential,
};
use soroban_sdk::{testutils::Address as _, Address, Env, String, Symbol, Vec};

// ═══════════════════════════════════════════════════════════════════
//  Existing credential tests (fixed)
// ═══════════════════════════════════════════════════════════════════

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

    // Verify credential is valid (not revoked — revocation checked via bit 0 of timestamp)
    assert!(verify_credential(&env, cred_id));

    // Revoke the credential
    revoke_credential(&env, cred_id, admin.clone());

    // Verify should now return false (credential is revoked)
    assert!(!verify_credential(&env, cred_id));

    // User credential list
    let user_creds: Vec<u64> = get_user_credentials(&env, recipient);
    assert_eq!(user_creds.len(), 1);
    assert_eq!(user_creds.get(0).unwrap(), 1);
}

#[test]
fn test_unauthorized_issuer_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let unauthorized = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    // Attempt to issue by unauthorized user should panic
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        issue_credential(
            &env,
            unauthorized.clone(),
            recipient.clone(),
            String::from_str(&env, "Test"),
            String::from_str(&env, "Desc"),
            String::from_str(&env, "course-001"),
            String::from_str(&env, "ipfs://Qm..."),
        )
    }));
    assert!(result.is_err());
}

#[test]
fn test_revoke_nonexistent_credential() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        revoke_credential(&env, 9999, admin.clone());
    }));
    assert!(result.is_err());
}

// ═══════════════════════════════════════════════════════════════════
//  Multi-Signature Credential Tests
// ═══════════════════════════════════════════════════════════════════

/// Test: Create a multi-sig credential with 2-of-3 issuers
/// Credential should activate only after 2 valid signatures
#[test]
fn test_multi_sig_2_of_3_activates_after_two_signatures() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signer3 = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let signers = Vec::from_array(&env, [
        signer1.clone(),
        signer2.clone(),
        signer3.clone(),
    ]);

    // Create 2-of-3 multi-sig credential
    let cred_id = create_multi_sig_credential(
        &env,
        admin.clone(),
        signers,
        2,
        recipient.clone(),
        String::from_str(&env, "BSc Computer Science"),
        String::from_str(&env, "Bachelor's degree in Computer Science"),
        String::from_str(&env, "degree-cs-2026"),
        String::from_str(&env, "ipfs://QmDegreeHash"),
    );

    assert_eq!(cred_id, 1);

    // Initially, credential should NOT be active
    assert!(!is_multi_sig_threshold_met(&env, cred_id));
    let (activated, sig_count, threshold) = get_multi_sig_status(&env, cred_id);
    assert!(!activated);
    assert_eq!(sig_count, 0);
    assert_eq!(threshold, 2);

    // First signature
    let result1 = add_multi_sig_signature(&env, cred_id, signer1.clone());
    assert!(!result1); // Threshold not yet met
    assert!(!is_multi_sig_threshold_met(&env, cred_id));

    let (activated2, sig_count2, _) = get_multi_sig_status(&env, cred_id);
    assert!(!activated2);
    assert_eq!(sig_count2, 1);

    // Second signature — should activate
    let result2 = add_multi_sig_signature(&env, cred_id, signer2.clone());
    assert!(result2); // Threshold met!
    assert!(is_multi_sig_threshold_met(&env, cred_id));

    let (activated3, sig_count3, threshold3) = get_multi_sig_status(&env, cred_id);
    assert!(activated3);
    assert_eq!(sig_count3, 2);
    assert_eq!(threshold3, 2);

    // Verify signatures
    let sigs = get_multi_sig_signatures(&env, cred_id);
    assert_eq!(sigs.len(), 2);
    assert!(sigs.contains(&signer1));
    assert!(sigs.contains(&signer2));
    assert!(!sigs.contains(&signer3));

    // Verify the credential itself
    let cred = get_multi_sig_credential(&env, cred_id);
    assert_eq!(cred.title, String::from_str(&env, "BSc Computer Science"));
    assert_eq!(cred.threshold, 2);
    assert!(cred.activated);
}

/// Test: Attempt to issue with insufficient signatures (1 of 3)
/// Credential remains inactive
#[test]
fn test_multi_sig_insufficient_signatures_remains_inactive() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signer3 = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let signers = Vec::from_array(&env, [
        signer1.clone(),
        signer2.clone(),
        signer3.clone(),
    ]);

    // Create 3-of-3 multi-sig credential
    let cred_id = create_multi_sig_credential(
        &env,
        admin.clone(),
        signers,
        3,
        recipient.clone(),
        String::from_str(&env, "PhD Physics"),
        String::from_str(&env, "Doctorate in Physics"),
        String::from_str(&env, "phd-physics-2026"),
        String::from_str(&env, "ipfs://QmPhDHash"),
    );

    // Only 1 signature — threshold is 3, should still be inactive
    add_multi_sig_signature(&env, cred_id, signer1.clone());
    assert!(!is_multi_sig_threshold_met(&env, cred_id));

    // Only 2 signatures — still inactive
    add_multi_sig_signature(&env, cred_id, signer2.clone());
    assert!(!is_multi_sig_threshold_met(&env, cred_id));

    let (activated, sig_count, threshold) = get_multi_sig_status(&env, cred_id);
    assert!(!activated);
    assert_eq!(sig_count, 2);
    assert_eq!(threshold, 3);

    // Verify credential shows as pending until threshold is met
    let cred = get_multi_sig_credential(&env, cred_id);
    assert!(!cred.activated);
}

/// Test: Duplicate signature from same issuer is rejected
#[test]
fn test_multi_sig_duplicate_signature_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let signers = Vec::from_array(&env, [signer1.clone(), signer2.clone()]);

    let cred_id = create_multi_sig_credential(
        &env,
        admin.clone(),
        signers,
        2,
        recipient.clone(),
        String::from_str(&env, "MBA"),
        String::from_str(&env, "Master of Business Administration"),
        String::from_str(&env, "mba-2026"),
        String::from_str(&env, "ipfs://QmMBAHash"),
    );

    // First signature by signer1
    let result = add_multi_sig_signature(&env, cred_id, signer1.clone());
    assert!(!result);

    // Attempt duplicate signature by signer1 — should panic
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        add_multi_sig_signature(&env, cred_id, signer1.clone());
    }));
    assert!(result.is_err());

    // Signature count should still be 1
    let sigs = get_multi_sig_signatures(&env, cred_id);
    assert_eq!(sigs.len(), 1);
}

/// Test: Unauthorized signer is rejected with clear error
#[test]
fn test_multi_sig_unauthorized_signer_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let unauthorized = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let signers = Vec::from_array(&env, [signer1.clone(), signer2.clone()]);

    let cred_id = create_multi_sig_credential(
        &env,
        admin.clone(),
        signers,
        2,
        recipient.clone(),
        String::from_str(&env, "MSc Data Science"),
        String::from_str(&env, "Master's in Data Science"),
        String::from_str(&env, "msc-ds-2026"),
        String::from_str(&env, "ipfs://QmMScHash"),
    );

    // Attempt signature by unauthorized address — should panic
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        add_multi_sig_signature(&env, cred_id, unauthorized.clone());
    }));
    assert!(result.is_err());

    // Signature count should still be 0
    let sigs = get_multi_sig_signatures(&env, cred_id);
    assert_eq!(sigs.len(), 0);
    assert!(!is_multi_sig_threshold_met(&env, cred_id));
}

/// Test: Query credential status shows pending until threshold met
#[test]
fn test_multi_sig_status_shows_pending_until_threshold_met() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signer3 = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let signers = Vec::from_array(&env, [
        signer1.clone(),
        signer2.clone(),
        signer3.clone(),
    ]);

    let cred_id = create_multi_sig_credential(
        &env,
        admin.clone(),
        signers,
        2,
        recipient.clone(),
        String::from_str(&env, "BEng Engineering"),
        String::from_str(&env, "Bachelor of Engineering"),
        String::from_str(&env, "beng-2026"),
        String::from_str(&env, "ipfs://QmBEngHash"),
    );

    // Status: pending (0 of 2)
    let (activated, sig_count, threshold) = get_multi_sig_status(&env, cred_id);
    assert!(!activated, "Should be pending with 0 signatures");
    assert_eq!(sig_count, 0);
    assert_eq!(threshold, 2);

    // After 1 signature: still pending
    add_multi_sig_signature(&env, cred_id, signer1.clone());
    let (activated, sig_count, threshold) = get_multi_sig_status(&env, cred_id);
    assert!(!activated, "Should still be pending with 1 signature");
    assert_eq!(sig_count, 1);
    assert_eq!(threshold, 2);

    // After 2 signatures: active
    add_multi_sig_signature(&env, cred_id, signer2.clone());
    let (activated, sig_count, threshold) = get_multi_sig_status(&env, cred_id);
    assert!(activated, "Should be active with 2 signatures");
    assert_eq!(sig_count, 2);
    assert_eq!(threshold, 2);
}

/// Test: Threshold edge cases — 1-of-1 (single signer acts like regular credential)
#[test]
fn test_multi_sig_1_of_1_threshold() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let signers = Vec::from_array(&env, [signer1.clone()]);

    let cred_id = create_multi_sig_credential(
        &env,
        admin.clone(),
        signers,
        1,
        recipient.clone(),
        String::from_str(&env, "Certificate"),
        String::from_str(&env, "Single signer certificate"),
        String::from_str(&env, "cert-2026"),
        String::from_str(&env, "ipfs://QmCertHash"),
    );

    // Single signature should activate immediately
    let result = add_multi_sig_signature(&env, cred_id, signer1.clone());
    assert!(result);
    assert!(is_multi_sig_threshold_met(&env, cred_id));

    let (activated, sig_count, threshold) = get_multi_sig_status(&env, cred_id);
    assert!(activated);
    assert_eq!(sig_count, 1);
    assert_eq!(threshold, 1);
}

/// Test: Threshold 0 is rejected at creation
#[test]
fn test_multi_sig_zero_threshold_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let signers = Vec::from_array(&env, [signer1.clone()]);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        create_multi_sig_credential(
            &env,
            admin.clone(),
            signers,
            0, // Invalid threshold
            recipient.clone(),
            String::from_str(&env, "Bad Cred"),
            String::from_str(&env, "Should fail"),
            String::from_str(&env, "bad-001"),
            String::from_str(&env, "ipfs://QmBad"),
        )
    }));
    assert!(result.is_err());
}

/// Test: Threshold greater than signer count is rejected
#[test]
fn test_multi_sig_threshold_exceeds_signers_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let signers = Vec::from_array(&env, [signer1.clone(), signer2.clone()]);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        create_multi_sig_credential(
            &env,
            admin.clone(),
            signers,
            5, // Threshold exceeds 2 signers
            recipient.clone(),
            String::from_str(&env, "Bad Cred"),
            String::from_str(&env, "Should fail"),
            String::from_str(&env, "bad-002"),
            String::from_str(&env, "ipfs://QmBad"),
        )
    }));
    assert!(result.is_err());
}

/// Test: Empty signer list is rejected
#[test]
fn test_multi_sig_empty_signers_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let signers = Vec::new(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        create_multi_sig_credential(
            &env,
            admin.clone(),
            signers,
            1,
            recipient.clone(),
            String::from_str(&env, "Empty Signers"),
            String::from_str(&env, "Should fail"),
            String::from_str(&env, "empty-001"),
            String::from_str(&env, "ipfs://QmEmpty"),
        )
    }));
    assert!(result.is_err());
}

/// Test: Full 3-of-3 flow with all signers
#[test]
fn test_multi_sig_3_of_3_full_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signer3 = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let signers = Vec::from_array(&env, [
        signer1.clone(),
        signer2.clone(),
        signer3.clone(),
    ]);

    let cred_id = create_multi_sig_credential(
        &env,
        admin.clone(),
        signers,
        3,
        recipient.clone(),
        String::from_str(&env, "DSc Honoris Causa"),
        String::from_str(&env, "Honorary Doctorate"),
        String::from_str(&env, "dsc-hc-2026"),
        String::from_str(&env, "ipfs://QmDScHash"),
    );

    assert!(!is_multi_sig_threshold_met(&env, cred_id));

    // All three sign
    add_multi_sig_signature(&env, cred_id, signer1.clone());
    assert!(!is_multi_sig_threshold_met(&env, cred_id));

    add_multi_sig_signature(&env, cred_id, signer2.clone());
    assert!(!is_multi_sig_threshold_met(&env, cred_id));

    // Third signature activates
    let result = add_multi_sig_signature(&env, cred_id, signer3.clone());
    assert!(result);
    assert!(is_multi_sig_threshold_met(&env, cred_id));

    let sigs = get_multi_sig_signatures(&env, cred_id);
    assert_eq!(sigs.len(), 3);
}

/// Test: Non-admin cannot create multi-sig credential
#[test]
fn test_multi_sig_only_admin_can_create() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let signers = Vec::from_array(&env, [signer1.clone()]);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        create_multi_sig_credential(
            &env,
            non_admin.clone(),
            signers,
            1,
            recipient.clone(),
            String::from_str(&env, "Unauthorized"),
            String::from_str(&env, "Should fail"),
            String::from_str(&env, "no-auth-001"),
            String::from_str(&env, "ipfs://QmFail"),
        )
    }));
    assert!(result.is_err());
}

/// Test: Attempting to sign after credential is activated returns error
#[test]
fn test_multi_sig_sign_after_activation_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signer3 = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage()
        .instance()
        .set(&Symbol::new(&env, "admin"), &admin);

    let signers = Vec::from_array(&env, [
        signer1.clone(),
        signer2.clone(),
        signer3.clone(),
    ]);

    let cred_id = create_multi_sig_credential(
        &env,
        admin.clone(),
        signers,
        2,
        recipient.clone(),
        String::from_str(&env, "BA History"),
        String::from_str(&env, "Bachelor of Arts in History"),
        String::from_str(&env, "ba-hist-2026"),
        String::from_str(&env, "ipfs://QmBAHash"),
    );

    // Activate with 2 signatures
    add_multi_sig_signature(&env, cred_id, signer1.clone());
    add_multi_sig_signature(&env, cred_id, signer2.clone());
    assert!(is_multi_sig_threshold_met(&env, cred_id));

    // Third signer tries to sign after activation — should fail
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        add_multi_sig_signature(&env, cred_id, signer3.clone());
    }));
    assert!(result.is_err());
}
