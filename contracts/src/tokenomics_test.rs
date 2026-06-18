#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    Address, Env, String,
};

use crate::tokenomics::{TokenomicsContract, TokenomicsContractClient};
use crate::user_profile::{UserProfileContract, UserProfileContractClient};

fn setup_with_achievements(
    env: &Env,
    achievement_tiers: &[u32],
) -> (TokenomicsContractClient, UserProfileContractClient, Address, Address, Address) {
    let tokenomics_id = env.register_contract(None, TokenomicsContract);
    let tokenomics = TokenomicsContractClient::new(env, &tokenomics_id);

    let profile_id = env.register_contract(None, UserProfileContract);
    let profile = UserProfileContractClient::new(env, &profile_id);

    let admin = Address::generate(env);
    let staker = Address::generate(env);

    profile.initialize();

    let username = String::from_str(env, "staker");
    tokenomics.initialize(&admin, &profile_id);

    env.mock_all_auths();

    profile.create_or_update_profile(
        &staker,
        &username,
        &None,
        &None,
        &None,
        &crate::user_profile::PrivacyLevel::Public,
    );

    for &tier in achievement_tiers {
        let title = String::from_str(env, "Achievement");
        let desc = String::from_str(env, "Test achievement");
        profile.add_achievement(&staker, &title, &desc, &None, &tier);
    }

    (tokenomics, profile, admin, staker, profile_id)
}

fn verify_achievements(env: &Env, profile: &UserProfileContractClient, admin: &Address, user: &Address) {
    let user_achievements = profile.get_user_achievements(user);
    for achievement in user_achievements.iter() {
        if (achievement.timestamp & 1u64) == 0 {
            profile.verify_achievement(admin, &achievement.id);
        }
    }
}

#[test]
fn test_no_achievements_base_multiplier() {
    let env = Env::default();
    let (tokenomics, _profile, _admin, staker, _profile_id) = setup_with_achievements(&env, &[]);

    env.mock_all_auths();

    // User with 0 verified achievements should get 1.0x multiplier
    let multiplier = tokenomics.refresh_achievement_multiplier(&staker);
    assert_eq!(multiplier, 10000);
}

#[test]
fn test_bronze_achievements_partial_multiplier() {
    let env = Env::default();
    let (tokenomics, profile, admin, staker, _profile_id) =
        setup_with_achievements(&env, &[0u32, 0u32, 0u32, 0u32, 0u32]);

    env.mock_all_auths_multiple(&[&admin, &staker]);
    verify_achievements(&env, &profile, &admin, &staker);

    // 5 Bronze achievements: each (1+1)*500 = 1000 bps, total = 5000 bps
    // multiplier = 10000 + 5000 = 15000 = 1.5x
    let multiplier = tokenomics.refresh_achievement_multiplier(&staker);
    assert_eq!(multiplier, 15000);
}

#[test]
fn test_mixed_achievements_multiplier() {
    let env = Env::default();
    let (tokenomics, profile, admin, staker, _profile_id) =
        setup_with_achievements(&env, &[0u32, 1u32]);

    env.mock_all_auths_multiple(&[&admin, &staker]);
    verify_achievements(&env, &profile, &admin, &staker);

    // 1 Bronze (weight 1): (1+1)*500 = 1000 bps
    // 1 Silver (weight 2): (2+1)*500 = 1500 bps
    // total = 2500 bps
    // multiplier = 10000 + 2500 = 12500 = 1.25x
    let multiplier = tokenomics.refresh_achievement_multiplier(&staker);
    assert_eq!(multiplier, 12500);
}

#[test]
fn test_multiplier_capped_at_2x() {
    let env = Env::default();
    let (tokenomics, profile, admin, staker, _profile_id) =
        setup_with_achievements(&env, &[3u32, 3u32, 3u32, 3u32, 3u32, 3u32]);

    env.mock_all_auths_multiple(&[&admin, &staker]);
    verify_achievements(&env, &profile, &admin, &staker);

    // 6 Platinum achievements: each (4+1)*500 = 2500 bps
    // total = 15000 bps
    // multiplier = min(10000 + 15000, 20000) = 20000 = 2.0x
    let multiplier = tokenomics.refresh_achievement_multiplier(&staker);
    assert_eq!(multiplier, 20000);
}

#[test]
fn test_staking_with_no_profile_multiplier() {
    let env = Env::default();
    let tokenomics_id = env.register_contract(None, TokenomicsContract);
    let tokenomics = TokenomicsContractClient::new(&env, &tokenomics_id);

    let profile_id = env.register_contract(None, UserProfileContract);
    let profile = UserProfileContractClient::new(&env, &profile_id);

    let admin = Address::generate(&env);
    let staker = Address::generate(&env);

    profile.initialize();
    tokenomics.initialize(&admin, &profile_id);

    // Mint some tokens for the staker first
    env.mock_all_auths();
    tokenomics.mint_reward(&staker, &1000);

    // Stake without any profile - should still work with base multiplier
    tokenomics.stake_tokens(&staker, &500, &604800); // 1 week lock

    // Advance time past lock duration
    env.ledger().set_timestamp(604800 + 1);

    // Unstake and claim - should succeed with base APY
    tokenomics.unstake_and_claim(&staker);
}
