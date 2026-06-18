#![cfg(test)]
extern crate std;

use crate::analyticsStorage::{
    AggregationConfig, AnalyticsContract, AnalyticsContractClient, AnalyticsSnapshot, ExportData,
    LearningOutcome,
};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger},
    Address, Env, Vec,
};

#[test]
fn test_analytics_initialization() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    assert_eq!(client.get_admin(), admin);

    let history = client.get_history();
    assert_eq!(history.len(), 0);

    assert_eq!(client.get_last_update(), 0);
    assert_eq!(client.get_snapshot_count(), 0);
}

#[test]
fn test_record_and_retrieve_metrics() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let total_users = 100;
    let active_users = 75;
    let total_courses = 5;
    let total_completions = 20;
    let avg_progress = 7500;
    let avg_quiz_score = 8200;
    let total_time = 5000;

    env.ledger().set_timestamp(1000);
    client.record_metrics(
        &total_users,
        &active_users,
        &total_courses,
        &total_completions,
        &avg_progress,
        &avg_quiz_score,
        &total_time,
    );

    let latest = client.get_latest().unwrap();
    assert_eq!(latest.total_users, total_users);
    assert_eq!(latest.active_users, active_users);
    assert_eq!(latest.avg_progress_bps, avg_progress);
    assert_eq!(latest.avg_quiz_score_bps, avg_quiz_score);
    assert_eq!(latest.total_time_spent, total_time);
    assert_eq!(latest.timestamp, 1000);
    assert_eq!(client.get_last_update(), 1000);
}

#[test]
fn test_historical_data_tracking() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    env.ledger().set_timestamp(1000);
    client.record_metrics(&100, &75, &5, &20, &7500, &8200, &5000);

    env.ledger().set_timestamp(2000);
    client.record_metrics(&110, &80, &6, &25, &7600, &8300, &5500);

    env.ledger().set_timestamp(3000);
    client.record_metrics(&125, &90, &7, &32, &7800, &8400, &6200);

    let history = client.get_history();
    assert_eq!(history.len(), 3);
    assert_eq!(history.get(0).unwrap().timestamp, 1000);
    assert_eq!(history.get(1).unwrap().timestamp, 2000);
    assert_eq!(history.get(2).unwrap().timestamp, 3000);

    assert_eq!(history.get(0).unwrap().total_users, 100);
    assert_eq!(history.get(1).unwrap().total_users, 110);
    assert_eq!(history.get(2).unwrap().total_users, 125);
}

#[test]
fn test_time_range_queries() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    env.ledger().set_timestamp(1000);
    client.record_metrics(&100, &75, &5, &20, &7500, &8200, &5000);

    env.ledger().set_timestamp(2000);
    client.record_metrics(&110, &80, &6, &25, &7600, &8300, &5500);

    env.ledger().set_timestamp(3000);
    client.record_metrics(&125, &90, &7, &32, &7800, &8400, &6200);

    env.ledger().set_timestamp(4000);
    client.record_metrics(&140, &100, &8, &40, &8000, &8500, &7000);

    let range = client.get_history_range(&1500, &3500);
    assert_eq!(range.len(), 2);
    assert_eq!(range.get(0).unwrap().timestamp, 2000);
    assert_eq!(range.get(1).unwrap().timestamp, 3000);
}

#[test]
fn test_learning_outcomes() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let mut outcomes = Vec::new(&env);
    outcomes.push_back(LearningOutcome {
        course_id: symbol_short!("COURSE1"),
        completion_rate_bps: 6500,
        avg_score_bps: 8200,
        total_enrolled: 150,
    });
    outcomes.push_back(LearningOutcome {
        course_id: symbol_short!("COURSE2"),
        completion_rate_bps: 7200,
        avg_score_bps: 8500,
        total_enrolled: 120,
    });

    env.ledger().set_timestamp(1000);
    client.record_outcomes(&outcomes);

    let retrieved = client.get_outcomes(&1000).unwrap();
    assert_eq!(retrieved.len(), 2);
    assert_eq!(
        retrieved.get(0).unwrap().course_id,
        symbol_short!("COURSE1")
    );
    assert_eq!(retrieved.get(0).unwrap().completion_rate_bps, 6500);
    assert_eq!(retrieved.get(1).unwrap().avg_score_bps, 8500);
}

#[test]
fn test_growth_metrics() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    env.ledger().set_timestamp(1000);
    client.record_metrics(&100, &75, &5, &20, &7500, &8200, &5000);

    env.ledger().set_timestamp(8000);
    client.record_metrics(&125, &90, &7, &32, &7800, &8400, &6200);

    let growth = client.get_growth_metrics(&0, &2000, &7000, &9000).unwrap();

    assert_eq!(growth.0, 25);
    assert_eq!(growth.1, 12);
    assert_eq!(growth.2, 300);
}

#[test]
fn test_public_transparency() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let retrieved_admin = client.get_admin();
    assert_eq!(retrieved_admin, admin);

    env.ledger().set_timestamp(1000);
    client.record_metrics(&100, &75, &5, &20, &7500, &8200, &5000);

    let history = client.get_history();
    assert_eq!(history.len(), 1);

    let latest = client.get_latest().unwrap();
    assert_eq!(latest.total_users, 100);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_cannot_reinitialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);
    client.initialize(&admin);
}

// ── New tests for aggregation snapshots, oracle, pagination, and export ──

#[test]
fn test_oracle_management() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);

    client.initialize(&admin);

    assert!(client.get_oracle().is_none());

    client.set_oracle(&oracle);
    assert_eq!(client.get_oracle().unwrap(), oracle);
}

#[test]
fn test_aggregation_config() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let config = client.get_aggregation_config();
    assert_eq!(config.bucket_size_seconds, 86400);
    assert_eq!(config.max_records_per_aggregation, 100);

    let new_config = AggregationConfig {
        bucket_size_seconds: 3600,
        max_records_per_aggregation: 50,
    };
    client.set_aggregation_config(&new_config);

    let retrieved = client.get_aggregation_config();
    assert_eq!(retrieved.bucket_size_seconds, 3600);
    assert_eq!(retrieved.max_records_per_aggregation, 50);
}

#[test]
fn test_single_aggregation_snapshot() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    env.ledger().set_timestamp(1000);
    client.record_metrics(&100, &75, &5, &20, &7500, &8200, &5000);

    env.ledger().set_timestamp(2000);
    client.record_metrics(&110, &80, &6, &25, &7600, &8300, &5500);

    env.ledger().set_timestamp(3000);
    client.record_metrics(&125, &90, &7, &32, &7800, &8400, &6200);

    let snapshot_id = client.trigger_aggregation();
    assert_eq!(snapshot_id, 1);

    assert_eq!(client.get_snapshot_count(), 1);

    let snapshot = client.get_snapshot(&1).unwrap();
    assert_eq!(snapshot.snapshot_id, 1);
    assert_eq!(snapshot.record_count, 3);
    assert_eq!(snapshot.total_users, 125);
    assert_eq!(snapshot.active_users, 90);
    assert_eq!(snapshot.total_courses, 7);
    assert_eq!(snapshot.total_completions, 32);
    assert_eq!(snapshot.total_time_spent, 5000 + 5500 + 6200);
    assert_eq!(snapshot.avg_progress_bps, (7500 + 7600 + 7800) / 3);
    assert_eq!(snapshot.avg_quiz_score_bps, (8200 + 8300 + 8400) / 3);
}

#[test]
fn test_multiple_aggregation_snapshots() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    env.ledger().set_timestamp(1000);
    client.record_metrics(&100, &75, &5, &20, &7500, &8200, &5000);

    let id1 = client.trigger_aggregation();
    assert_eq!(id1, 1);

    env.ledger().set_timestamp(2000);
    client.record_metrics(&110, &80, &6, &25, &7600, &8300, &5500);

    env.ledger().set_timestamp(3000);
    client.record_metrics(&125, &90, &7, &32, &7800, &8400, &6200);

    let id2 = client.trigger_aggregation();
    assert_eq!(id2, 2);

    assert_eq!(client.get_snapshot_count(), 2);

    let snap1 = client.get_snapshot(&1).unwrap();
    assert_eq!(snap1.record_count, 1);
    assert_eq!(snap1.total_users, 100);

    let snap2 = client.get_snapshot(&2).unwrap();
    assert_eq!(snap2.record_count, 2);
    assert_eq!(snap2.total_users, 125);
}

#[test]
fn test_aggregation_no_new_records() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    client.trigger_aggregation();
}

#[test]
fn test_bounded_aggregation() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let small_config = AggregationConfig {
        bucket_size_seconds: 86400,
        max_records_per_aggregation: 2,
    };
    client.set_aggregation_config(&small_config);

    for i in 1..=5u64 {
        env.ledger().set_timestamp(i * 1000);
        client.record_metrics(
            &(100 + i * 10),
            &(70 + i * 5),
            &(5 + i as u32 / 2) as &u64,
            &(20 + i * 5),
            &(7500 + (i as u32 * 100)),
            &(8200 + (i as u32 * 50)),
            &(5000 + i * 500),
        );
    }

    let id1 = client.trigger_aggregation();
    assert_eq!(id1, 1);
    let snap1 = client.get_snapshot(&1).unwrap();
    assert_eq!(snap1.record_count, 2);

    let id2 = client.trigger_aggregation();
    assert_eq!(id2, 2);
    let snap2 = client.get_snapshot(&2).unwrap();
    assert_eq!(snap2.record_count, 2);

    let id3 = client.trigger_aggregation();
    assert_eq!(id3, 3);
    let snap3 = client.get_snapshot(&3).unwrap();
    assert_eq!(snap3.record_count, 1);

    assert_eq!(client.get_snapshot_count(), 3);
}

#[test]
fn test_get_snapshot_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let missing = client.get_snapshot(&999);
    assert!(missing.is_none());
}

#[test]
fn test_snapshots_paginated() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let small_config = AggregationConfig {
        bucket_size_seconds: 86400,
        max_records_per_aggregation: 1,
    };
    client.set_aggregation_config(&small_config);

    for i in 1..=5u64 {
        env.ledger().set_timestamp(i * 1000);
        client.record_metrics(
            &(100 + i * 10),
            &(70 + i * 5),
            &(5 + i as u32) as &u64,
            &(20 + i * 5),
            &(7500 + (i as u32 * 100)),
            &(8200 + (i as u32 * 50)),
            &(5000 + i * 500),
        );
        client.trigger_aggregation();
    }

    assert_eq!(client.get_snapshot_count(), 5);

    let page1 = client.get_snapshots_paginated(&1, &2);
    assert_eq!(page1.len(), 2);
    assert_eq!(page1.get(0).unwrap().snapshot_id, 1);
    assert_eq!(page1.get(1).unwrap().snapshot_id, 2);

    let page2 = client.get_snapshots_paginated(&2, &2);
    assert_eq!(page2.len(), 2);
    assert_eq!(page2.get(0).unwrap().snapshot_id, 3);
    assert_eq!(page2.get(1).unwrap().snapshot_id, 4);

    let page3 = client.get_snapshots_paginated(&3, &2);
    assert_eq!(page3.len(), 1);
    assert_eq!(page3.get(0).unwrap().snapshot_id, 5);
}

#[test]
fn test_snapshots_paginated_empty() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let page = client.get_snapshots_paginated(&1, &10);
    assert_eq!(page.len(), 0);
}

#[test]
fn test_snapshots_paginated_clamps_page_size() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let page = client.get_snapshots_paginated(&1, &100);
    assert_eq!(page.len(), 0);
}

#[test]
fn test_export_analytics_full_range() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let small_config = AggregationConfig {
        bucket_size_seconds: 86400,
        max_records_per_aggregation: 1,
    };
    client.set_aggregation_config(&small_config);

    for i in 1..=3u64 {
        env.ledger().set_timestamp(i * 1000);
        client.record_metrics(
            &(100 + i * 10),
            &(70 + i * 5),
            &(5 + i as u32) as &u64,
            &(20 + i * 5),
            &(7500 + (i as u32 * 100)),
            &(8200 + (i as u32 * 50)),
            &(5000 + i * 500),
        );
        client.trigger_aggregation();
    }

    let export = client.export_analytics(&0, &999999);
    assert_eq!(export.snapshot_count, 3);
    assert!(export.total_users > 0);
    assert!(export.total_completions > 0);
    assert!(export.avg_progress_bps > 0);
    assert!(export.avg_quiz_score_bps > 0);
    assert!(export.snapshots.len() == 3);
}

#[test]
fn test_export_analytics_partial_range() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let small_config = AggregationConfig {
        bucket_size_seconds: 86400,
        max_records_per_aggregation: 1,
    };
    client.set_aggregation_config(&small_config);

    for i in 1..=4u64 {
        env.ledger().set_timestamp(i * 1000);
        client.record_metrics(
            &(100 + i * 10),
            &(70 + i * 5),
            &(5 + i as u32) as &u64,
            &(20 + i * 5),
            &(7500 + (i as u32 * 100)),
            &(8200 + (i as u32 * 50)),
            &(5000 + i * 500),
        );
        client.trigger_aggregation();
    }

    let export = client.export_analytics(&1500, &3500);
    assert_eq!(export.snapshot_count, 2);
    assert_eq!(export.snapshots.len(), 2);
    assert_eq!(export.period_start, 1500);
    assert_eq!(export.period_end, 3500);
}

#[test]
fn test_export_analytics_empty_range() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let export = client.export_analytics(&0, &999999);
    assert_eq!(export.snapshot_count, 0);
    assert_eq!(export.snapshots.len(), 0);
    assert_eq!(export.total_users, 0);
    assert_eq!(export.active_users, 0);
    assert_eq!(export.total_courses, 0);
    assert_eq!(export.avg_progress_bps, 0);
    assert_eq!(export.avg_quiz_score_bps, 0);
}

#[test]
fn test_export_analytics_mutiple_records_per_snapshot() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    env.ledger().set_timestamp(1000);
    client.record_metrics(&100, &75, &5, &20, &7500, &8200, &5000);

    env.ledger().set_timestamp(2000);
    client.record_metrics(&110, &80, &6, &25, &7600, &8300, &5500);

    client.trigger_aggregation();

    let export = client.export_analytics(&500, &2500);
    assert_eq!(export.snapshot_count, 1);
    assert_eq!(export.total_users, 110);
    assert_eq!(export.active_users, 80);
    assert_eq!(export.total_courses, 6);
    assert_eq!(export.total_completions, 25);
}

#[test]
fn test_full_analytics_workflow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let oracle = Address::generate(&env);

    client.initialize(&admin);

    client.set_oracle(&oracle);
    assert_eq!(client.get_oracle().unwrap(), oracle);

    let small_config = AggregationConfig {
        bucket_size_seconds: 3600,
        max_records_per_aggregation: 3,
    };
    client.set_aggregation_config(&small_config);
    let config = client.get_aggregation_config();
    assert_eq!(config.bucket_size_seconds, 3600);

    for i in 1..=7u64 {
        env.ledger().set_timestamp(i * 1000);
        client.record_metrics(
            &(100 + i * 10),
            &(70 + i * 5),
            &(5 + i as u32) as &u64,
            &(20 + i * 5),
            &(7500 + (i as u32 * 100)),
            &(8200 + (i as u32 * 50)),
            &(5000 + i * 500),
        );
    }

    let id1 = client.trigger_aggregation();
    assert_eq!(id1, 1);
    let snap1 = client.get_snapshot(&1).unwrap();
    assert_eq!(snap1.record_count, 3);

    let id2 = client.trigger_aggregation();
    assert_eq!(id2, 2);
    let snap2 = client.get_snapshot(&2).unwrap();
    assert_eq!(snap2.record_count, 3);

    let id3 = client.trigger_aggregation();
    assert_eq!(id3, 3);
    let snap3 = client.get_snapshot(&3).unwrap();
    assert_eq!(snap3.record_count, 1);

    assert_eq!(client.get_snapshot_count(), 3);

    let page1 = client.get_snapshots_paginated(&1, &2);
    assert_eq!(page1.len(), 2);

    let page2 = client.get_snapshots_paginated(&2, &2);
    assert_eq!(page2.len(), 1);

    let export = client.export_analytics(&0, &999999);
    assert_eq!(export.snapshot_count, 3);

    let partial = client.export_analytics(&1500, &5500);
    assert_eq!(partial.snapshot_count, 2);
}
