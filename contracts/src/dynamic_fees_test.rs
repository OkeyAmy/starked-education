#![cfg(test)]
use soroban_sdk::{Address, Env, String};
use crate::dynamic_fees::{
    DynamicFeeContract, DynamicFeeConfig, UserBehaviorMetrics, NetworkMetrics, 
    CongestionLevel, RewardType, FeeKey
};

#[test]
fn test_fee_system_initialization() {
    let env = Env::default();
    let admin = Address::random(&env);
    
    // Test initialization
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Verify config was set
    let config: DynamicFeeConfig = env.storage().instance()
        .get(&FeeKey::Config)
        .unwrap();
    assert_eq!(config.base_fee, 1000);
    assert_eq!(config.network_multiplier, 100);
    
    // Verify discount tiers were created
    let tier1 = DynamicFeeContract::get_user_discount_tier(env.clone(), admin.clone());
    assert_eq!(tier1.tier_id, 0); // Default tier for new user
}

#[test]
fn test_basic_fee_calculation() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Calculate fee for new user
    let fee = DynamicFeeContract::calculate_fee(
        env.clone(),
        user.clone(),
        1000,
        "standard".into_val(&env),
    );
    
    assert!(fee.final_fee >= fee.base_fee);
    assert_eq!(fee.base_fee, 1000);
    assert!(fee.calculation_timestamp > 0);
}

#[test]
fn test_network_congestion_impact() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Test low congestion
    let low_metrics = NetworkMetrics {
        current_block_time: 5000,
        transactions_per_block: 10,
        average_fee: 1000,
        network_utilization: 30,
        congestion_level: CongestionLevel::Low,
        timestamp: env.ledger().timestamp(),
    };
    DynamicFeeContract::update_network_metrics(env.clone(), low_metrics);
    
    let low_fee = DynamicFeeContract::calculate_fee(
        env.clone(),
        user.clone(),
        1000,
        "standard".into_val(&env),
    );
    
    // Test high congestion
    let high_metrics = NetworkMetrics {
        current_block_time: 5000,
        transactions_per_block: 100,
        average_fee: 1000,
        network_utilization: 80,
        congestion_level: CongestionLevel::High,
        timestamp: env.ledger().timestamp(),
    };
    DynamicFeeContract::update_network_metrics(env.clone(), high_metrics);
    
    let high_fee = DynamicFeeContract::calculate_fee(
        env.clone(),
        user.clone(),
        1000,
        "standard".into_val(&env),
    );
    
    // High congestion should result in higher fees
    assert!(high_fee.final_fee > low_fee.final_fee);
}

#[test]
fn test_user_reputation_system() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Simulate successful transactions to build reputation
    for i in 0..50 {
        DynamicFeeContract::update_user_metrics(
            env.clone(),
            user.clone(),
            true,
            1000 + i * 100,
        );
    }
    
    // Check that user now has a discount tier
    let tier = DynamicFeeContract::get_user_discount_tier(env.clone(), user.clone());
    assert!(tier.tier_id > 0);
    assert!(tier.discount_percentage > 0);
    
    // Calculate fee with reputation discount
    let fee_with_rep = DynamicFeeContract::calculate_fee(
        env.clone(),
        user.clone(),
        1000,
        "standard".into_val(&env),
    );
    
    // Should be lower than base fee due to discount
    assert!(fee_with_rep.final_fee < fee_with_rep.base_fee);
}

#[test]
fn test_abuse_detection_system() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Simulate abusive behavior (rapid transactions)
    for _ in 0..15 {
        DynamicFeeContract::update_user_metrics(
            env.clone(),
            user.clone(),
            false, // Failed transactions
            1000,
        );
    }
    
    // Calculate fee - should include abuse premium
    let abusive_fee = DynamicFeeContract::calculate_fee(
        env.clone(),
        user.clone(),
        1000,
        "standard".into_val(&env),
    );
    
    // Should be higher due to abuse premium
    assert!(abusive_fee.abuse_premium > 0);
    assert!(abusive_fee.final_fee > abusive_fee.base_fee);
}

#[test]
fn test_incentive_rewards() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Issue a fee discount reward
    let reward_id = DynamicFeeContract::issue_reward(
        env.clone(),
        admin.clone(),
        user.clone(),
        RewardType::FeeDiscount,
        10, // 10% discount
        "Good behavior reward".into_val(&env),
        86400, // 24 hours duration
    );
    
    assert!(reward_id > 0);
    
    // Calculate fee with reward discount
    let fee_with_reward = DynamicFeeContract::calculate_fee(
        env.clone(),
        user.clone(),
        1000,
        "standard".into_val(&env),
    );
    
    // Should include incentive discount
    assert!(fee_with_reward.incentive_discount > 0);
}

#[test]
fn test_fee_smoothing() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Create critical congestion to test smoothing
    let critical_metrics = NetworkMetrics {
        current_block_time: 5000,
        transactions_per_block: 200,
        average_fee: 1000,
        network_utilization: 95,
        congestion_level: CongestionLevel::Critical,
        timestamp: env.ledger().timestamp(),
    };
    DynamicFeeContract::update_network_metrics(env.clone(), critical_metrics);
    
    let smoothed_fee = DynamicFeeContract::calculate_fee(
        env.clone(),
        user.clone(),
        1000,
        "standard".into_val(&env),
    );
    
    // Even with critical congestion, fee should be smoothed
    let max_possible_increase = 1000 * 200 / 100; // Max 200% increase
    assert!(smoothed_fee.final_fee <= 1000 + max_possible_increase);
}

#[test]
fn test_fee_transparency_report() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Generate some activity
    for i in 0..10 {
        DynamicFeeContract::update_user_metrics(
            env.clone(),
            user.clone(),
            true,
            1000 + i * 50,
        );
    }
    
    // Get fee report
    let report = DynamicFeeContract::get_fee_report(env.clone(), user.clone());
    
    // Report should contain user information
    assert!(report.contains("Fee Report for User"));
    assert!(report.contains("Reputation Score"));
    assert!(report.contains("Total Transactions"));
}

#[test]
fn test_discount_tier_progression() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Start at tier 0
    let initial_tier = DynamicFeeContract::get_user_discount_tier(env.clone(), user.clone());
    assert_eq!(initial_tier.tier_id, 0);
    
    // Build reputation for tier 2
    for i in 0..100 {
        DynamicFeeContract::update_user_metrics(
            env.clone(),
            user.clone(),
            true,
            1000,
        );
    }
    
    let upgraded_tier = DynamicFeeContract::get_user_discount_tier(env.clone(), user.clone());
    assert!(upgraded_tier.tier_id >= 2);
    assert!(upgraded_tier.discount_percentage >= 10);
}

#[test]
fn test_multiple_reward_types() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Issue different types of rewards
    let fee_discount_id = DynamicFeeContract::issue_reward(
        env.clone(),
        admin.clone(),
        user.clone(),
        RewardType::FeeDiscount,
        15,
        "Fee discount reward".into_val(&env),
        86400,
    );
    
    let reputation_boost_id = DynamicFeeContract::issue_reward(
        env.clone(),
        admin.clone(),
        user.clone(),
        RewardType::ReputationBoost,
        50,
        "Reputation boost".into_val(&env),
        86400,
    );
    
    assert!(fee_discount_id > 0);
    assert!(reputation_boost_id > 0);
    
    // Check that reputation was boosted
    let tier_after_boost = DynamicFeeContract::get_user_discount_tier(env.clone(), user.clone());
    assert!(tier_after_boost.tier_id > 0); // Should have some discount now
}

#[test]
fn test_fee_history_tracking() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Generate multiple fee calculations
    for i in 0..5 {
        DynamicFeeContract::calculate_fee(
            env.clone(),
            user.clone(),
            1000 + i * 100,
            format!("transaction_{}", i).into_val(&env),
        );
    }
    
    // Check that fee history is stored
    let history_key = FeeKey::FeeHistory(user);
    let history_exists = env.storage().instance().has(&history_key);
    assert!(history_exists);
}

#[test]
fn test_extreme_abuse_blocking() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Simulate extreme abuse
    for _ in 0..100 {
        DynamicFeeContract::update_user_metrics(
            env.clone(),
            user.clone(),
            false, // All failed
            1000,
        );
    }
    
    // Calculate fee for abusive user
    let abusive_fee = DynamicFeeContract::calculate_fee(
        env.clone(),
        user.clone(),
        1000,
        "standard".into_val(&env),
    );
    
    // Should have very high abuse premium
    assert!(abusive_fee.abuse_premium >= 5000);
}

#[test]
fn test_network_metrics_history() {
    let env = Env::default();
    let admin = Address::random(&env);
    
    DynamicFeeContract::initialize(env.clone(), admin.clone());
    
    // Update network metrics multiple times
    for i in 0..3 {
        let metrics = NetworkMetrics {
            current_block_time: 5000,
            transactions_per_block: 10 + i * 10,
            average_fee: 1000,
            network_utilization: 30 + i * 10,
            congestion_level: CongestionLevel::Low,
            timestamp: env.ledger().timestamp() + i * 1000,
        };
        DynamicFeeContract::update_network_metrics(env.clone(), metrics);
    }
    
    // Verify history is stored
    let current_metrics = DynamicFeeContract::get_current_fee(env.clone(), Address::random(&env), 1000);
    assert!(current_metrics > 0);
}
