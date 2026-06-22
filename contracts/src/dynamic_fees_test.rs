#![cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::*;
    use soroban_sdk::{Env, Address};

    fn setup_env() -> (Env, Address) {
        let env = Env::default();
        let admin = Address::generate(&env);
        DynamicFeeContract::initialize(env.clone(), admin.clone());
        (env, admin)
    }

    // SECURITY: Test 1 - Zero fee input validation
    #[test]
    fn test_calculate_fee_zero_base() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        // Should handle zero values gracefully
        let calculation = DynamicFeeContract::calculate_fee(
            env.clone(),
            user,
            0,
            "standard".into_val(env),
        );
        
        assert_eq!(calculation.final_fee, 0);
    }

    // SECURITY: Test 2 - Large transaction values (edge case)
    #[test]
    fn test_calculate_fee_large_transaction() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        // Large u64 value
        let large_value = u64::MAX / 2;
        
        let calculation = DynamicFeeContract::calculate_fee(
            env.clone(),
            user,
            large_value,
            "standard".into_val(env),
        );
        
        // Should not overflow
        assert!(calculation.final_fee > 0);
        assert!(calculation.final_fee <= u64::MAX);
    }

    // SECURITY: Test 3 - Network multiplier at boundaries
    #[test]
    fn test_network_adjustment_critical_congestion() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        let critical_metrics = NetworkMetrics {
            current_block_time: 5000,
            transactions_per_block: 1000,
            average_fee: 5000,
            network_utilization: 99,
            congestion_level: CongestionLevel::Critical,
            timestamp: env.ledger().timestamp(),
        };
        
        DynamicFeeContract::update_network_metrics(env.clone(), critical_metrics);
        
        let calculation = DynamicFeeContract::calculate_fee(
            env.clone(),
            user,
            1000,
            "standard".into_val(env),
        );
        
        // Critical congestion should significantly increase fee
        assert!(calculation.final_fee > 1000);
    }

    // SECURITY: Test 4 - User discount capping at 50%
    #[test]
    fn test_user_discount_cap() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        // Create excellent user metrics (90% success rate, high streak)
        let excellent_metrics = UserBehaviorMetrics {
            user: user.clone(),
            transaction_count: 100,
            successful_transactions: 90,
            failed_transactions: 10,
            average_transaction_value: 10000,
            last_activity_timestamp: env.ledger().timestamp(),
            reputation_score: 950,
            abuse_score: 0,
            streak_days: 60,
        };
        
        env.storage().instance().set(
            &FeeKey::UserMetrics(user.clone()),
            &excellent_metrics,
        );
        
        let calculation = DynamicFeeContract::calculate_fee(
            env.clone(),
            user.clone(),
            1000,
            "standard".into_val(env),
        );
        
        // Discount should never exceed 50%
        assert!(calculation.user_discount <= 500); // 500 stroops = 50%
    }

    // SECURITY: Test 5 - Abuse premium for blocked users
    #[test]
    fn test_abuse_premium_blocked_user() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        let blocked_abuse = AbuseDetection {
            user: user.clone(),
            rapid_transactions: 50,
            unusual_patterns: true,
            suspicious_amounts: true,
            blocked_until: env.ledger().timestamp() + 3600, // Blocked for 1 hour
            violation_count: 10,
        };
        
        env.storage().instance().set(
            &FeeKey::AbuseDetection(user.clone()),
            &blocked_abuse,
        );
        
        let calculation = DynamicFeeContract::calculate_fee(
            env.clone(),
            user,
            1000,
            "standard".into_val(env),
        );
        
        // Blocked users should have 10000 stroops premium (very high)
        assert_eq!(calculation.abuse_premium, 10000);
    }

    // SECURITY: Test 6 - Incentive discount capping at 25%
    #[test]
    fn test_incentive_discount_cap() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        // Issue multiple fee discount rewards
        for i in 0..5 {
            let reward = IncentiveReward {
                reward_id: i as u64,
                user: user.clone(),
                reward_type: RewardType::FeeDiscount,
                amount: 10, // 10% each
                reason: format!("Bonus {}", i).into_val(env),
                timestamp: env.ledger().timestamp(),
                expires_at: env.ledger().timestamp() + 86400, // 1 day
            };
            
            env.storage().instance().set(&FeeKey::Reward(i as u64), &reward);
        }
        
        env.storage().instance().set(&FeeKey::RewardCount, &5u64);
        
        let calculation = DynamicFeeContract::calculate_fee(
            env.clone(),
            user,
            1000,
            "standard".into_val(env),
        );
        
        // Incentive discount should cap at 25%
        assert!(calculation.incentive_discount <= 250); // 250 stroops = 25%
    }

    // SECURITY: Test 7 - Overflow protection on network adjustment
    #[test]
    fn test_network_adjustment_no_overflow() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        let max_utilization_metrics = NetworkMetrics {
            current_block_time: 5000,
            transactions_per_block: u64::MAX / 2,
            average_fee: u64::MAX / 4,
            network_utilization: 100,
            congestion_level: CongestionLevel::Critical,
            timestamp: env.ledger().timestamp(),
        };
        
        DynamicFeeContract::update_network_metrics(env.clone(), max_utilization_metrics);
        
        // Should not panic on overflow
        let calculation = DynamicFeeContract::calculate_fee(
            env.clone(),
            user,
            1000,
            "standard".into_val(env),
        );
        
        assert!(calculation.final_fee >= 0);
    }

    // SECURITY: Test 8 - Re-entrancy protection
    #[test]
    #[should_panic(expected = "Re-entrancy detected")]
    fn test_reentrancy_prevention() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        // Set lock manually to simulate re-entrant call
        env.storage().instance().set(&ReentrancyKey::Locked, &true);
        
        // This should panic
        let _ = DynamicFeeContract::calculate_fee(
            env.clone(),
            user,
            1000,
            "standard".into_val(env),
        );
    }

    // SECURITY: Test 9 - Reputation score bounds
    #[test]
    fn test_reputation_score_bounds() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        // Create metrics that would produce extreme reputation
        let extreme_metrics = UserBehaviorMetrics {
            user: user.clone(),
            transaction_count: 10000,
            successful_transactions: 10000,
            failed_transactions: 0,
            average_transaction_value: 100000,
            last_activity_timestamp: env.ledger().timestamp(),
            reputation_score: 500,
            abuse_score: 0,
            streak_days: 365,
        };
        
        let score = DynamicFeeContract::calculate_reputation_score(&extreme_metrics);
        
        // Score should never exceed 1000
        assert!(score <= 1000);
        assert!(score >= 0);
    }

    // SECURITY: Test 10 - Fee smoothing prevents extreme jumps
    #[test]
    fn test_fee_smoothing_caps_increase() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        // Create high congestion scenario with large multiplier
        let high_congestion = NetworkMetrics {
            current_block_time: 1000,
            transactions_per_block: 500,
            average_fee: 100000,
            network_utilization: 95,
            congestion_level: CongestionLevel::Critical,
            timestamp: env.ledger().timestamp(),
        };
        
        DynamicFeeContract::update_network_metrics(env.clone(), high_congestion);
        
        let calculation = DynamicFeeContract::calculate_fee(
            env.clone(),
            user,
            1000,
            "standard".into_val(env),
        );
        
        // Fee should not increase by more than 200% per block (config.max_fee_increase)
        assert!(calculation.final_fee <= 1000 + (1000 * 200 / 100));
    }

    // SECURITY: Test 11 - Abuse score increments safely
    #[test]
    fn test_abuse_detection_no_overflow() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        // Create metrics with rapid transactions
        for _ in 0..20 {
            DynamicFeeContract::update_user_metrics(
                env.clone(),
                user.clone(),
                false, // Failed transactions trigger abuse detection
                1000,
            );
        }
        
        // Should not panic on abuse score overflow
        let abuse = env.storage().instance()
            .get::<_, AbuseDetection>(&FeeKey::AbuseDetection(user.clone()))
            .unwrap();
        
        // Abuse score should be bounded
        assert!(abuse.abuse_score <= 1000);
    }

    // SECURITY: Test 12 - Division by zero protection
    #[test]
    fn test_success_rate_calculation_zero_transactions() {
        let (env, _) = setup_env();
        
        let new_user_metrics = UserBehaviorMetrics {
            user: Address::generate(&env),
            transaction_count: 0, // Zero transactions
            successful_transactions: 0,
            failed_transactions: 0,
            average_transaction_value: 0,
            last_activity_timestamp: 0,
            reputation_score: 100,
            abuse_score: 0,
            streak_days: 0,
        };
        
        // Should handle division gracefully
        let score = DynamicFeeContract::calculate_reputation_score(&new_user_metrics);
        assert!(score >= 0);
    }

    // SECURITY: Test 13 - Reward expiration prevents stale discounts
    #[test]
    fn test_expired_rewards_not_applied() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        let current_time = env.ledger().timestamp();
        
        let expired_reward = IncentiveReward {
            reward_id: 1,
            user: user.clone(),
            reward_type: RewardType::FeeDiscount,
            amount: 20,
            reason: "Expired bonus".into_val(env),
            timestamp: current_time - 1000,
            expires_at: current_time - 100, // Expired
        };
        
        env.storage().instance().set(&FeeKey::Reward(1), &expired_reward);
        env.storage().instance().set(&FeeKey::RewardCount, &1u64);
        
        let calculation = DynamicFeeContract::calculate_fee(
            env.clone(),
            user,
            1000,
            "standard".into_val(env),
        );
        
        // Expired reward should not apply discount
        assert_eq!(calculation.incentive_discount, 0);
    }

    // SECURITY: Test 14 - Fuzz test with randomized values
    #[test]
    fn test_fuzz_random_fee_inputs() {
        let (env, _) = setup_env();
        
        // Test with various random-like values
        let test_values = vec![
            1u64,
            100u64,
            1000u64,
            10000u64,
            100000u64,
            1000000u64,
            u64::MAX / 2,
        ];
        
        for value in test_values {
            let user = Address::generate(&env);
            
            // Should not panic on any value
            let calculation = DynamicFeeContract::calculate_fee(
                env.clone(),
                user,
                value,
                "standard".into_val(env),
            );
            
            // Basic sanity checks
            assert!(calculation.final_fee < u64::MAX);
            assert!(calculation.base_fee > 0);
        }
    }

    // SECURITY: Test 15 - CEI pattern validation (state before effects)
    #[test]
    fn test_fee_history_stored_before_lock_release() {
        let (env, _) = setup_env();
        let user = Address::generate(&env);
        
        let calculation = DynamicFeeContract::calculate_fee(
            env.clone(),
            user.clone(),
            1000,
            "standard".into_val(env.clone()),
        );
        
        // Fee should be stored in history
        let history = env.storage().instance()
            .get::<_, Vec<FeeCalculation>>(&FeeKey::FeeHistory(user.clone()))
            .unwrap();
        
        assert!(history.len() > 0);
        assert_eq!(history.get(0).unwrap().final_fee, calculation.final_fee);
        
        // Lock should be released
        assert!(!env.storage().instance().has(&ReentrancyKey::Locked));
    }
}