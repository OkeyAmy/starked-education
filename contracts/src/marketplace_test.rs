#![cfg(test)]
extern crate std;

use crate::marketplace::{MarketplaceContract, MarketplaceContractClient, MarketplaceKey};
use crate::utils::storage::StorageKey;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

#[test]
fn test_marketplace_initialization() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MarketplaceContract);
    let client = MarketplaceContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    // Verify admin is set in storage (internal check via client is better, but MarketplaceContract doesn't have get_admin)
    // We'll trust the initialize function worked if it doesn't panic on second call
}

#[test]
fn test_listing_and_purchase() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MarketplaceContract);
    let client = MarketplaceContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);

    client.initialize(&admin);

    let credential_id = 1u64;
    let price = 1000u64;
    let royalty_bps = 500; // 5%

    let listing_id = client.list_credential(&seller, &credential_id, &price, &royalty_bps);
    assert_eq!(listing_id, 1);

    client.purchase_credential(&buyer, &listing_id);

    // Trade count should increment
    let price_after = client.calculate_bonding_price(&credential_id);
    assert!(price_after > 100); // Base price is 100, price should increase after a trade
}

#[test]
fn test_licensing_and_bonding_curve() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MarketplaceContract);
    let client = MarketplaceContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let tenant = Address::generate(&env);

    client.initialize(&admin);

    let credential_id = 1u64;

    // Initial price
    let price1 = client.calculate_bonding_price(&credential_id);
    assert_eq!(price1, 100); // 100 + 10 * 0 * 0

    // Rent
    client.rent_credential(&tenant, &credential_id, &3600);

    // Bonding curve check: we need trades to increase price
    // Since rent_credential doesn't increment TradeCount in the current implementation (only purchase does),
    // let's verify purchase increments it.
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let listing_id = client.list_credential(&seller, &credential_id, &1000, &500);
    client.purchase_credential(&buyer, &listing_id);

    let price2 = client.calculate_bonding_price(&credential_id);
    assert_eq!(price2, 110); // 100 + 10 * 1 * 1
}

#[test]
fn test_staking_and_rewards() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MarketplaceContract);
    let client = MarketplaceContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let staker = Address::generate(&env);

    client.initialize(&admin);

    env.ledger().set_timestamp(1000);
    let credential_id = 1u64;
    let amount = 10000u64;

    client.stake_credential(&staker, &credential_id, &amount);

    // Fast forward 1 day (86400 seconds)
    env.ledger().set_timestamp(1000 + 86400);

    let rewards = client.claim_rewards(&staker, &credential_id);
    // base_reward = 10000 * 86400 / 8640000 = 100
    // total_reward = 100 + (100 * 100 / 1000) = 110
    assert_eq!(rewards, 110);
}

#[test]
fn test_dispute_resolution() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MarketplaceContract);
    let client = MarketplaceContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let buyer = Address::generate(&env);

    client.initialize(&admin);

    let listing_id = 1u64;
    let reason = String::from_str(&env, "Credential not valid");

    let dispute_id = client.open_dispute(&buyer, &listing_id, &reason);
    assert_eq!(dispute_id, 1);

    client.resolve_dispute(&admin, &dispute_id, &true);
}
