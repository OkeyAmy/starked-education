#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AnalyticsRecord {
    pub timestamp: u64,
    pub total_users: u64,
    pub active_users: u64,
    pub total_courses: u64,
    pub total_completions: u64,
    pub avg_progress_bps: u32,
    pub avg_quiz_score_bps: u32,
    pub total_time_spent: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LearningOutcome {
    pub course_id: Symbol,
    pub completion_rate_bps: u32,
    pub avg_score_bps: u32,
    pub total_enrolled: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AnalyticsSnapshot {
    pub snapshot_id: u64,
    pub period_start: u64,
    pub period_end: u64,
    pub total_users: u64,
    pub active_users: u64,
    pub total_courses: u64,
    pub total_completions: u64,
    pub credentials_issued: u64,
    pub avg_progress_bps: u32,
    pub avg_quiz_score_bps: u32,
    pub total_time_spent: u64,
    pub record_count: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AggregationConfig {
    pub bucket_size_seconds: u64,
    pub max_records_per_aggregation: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExportData {
    pub period_start: u64,
    pub period_end: u64,
    pub total_users: u64,
    pub active_users: u64,
    pub total_courses: u64,
    pub total_completions: u64,
    pub credentials_issued: u64,
    pub avg_progress_bps: u32,
    pub avg_quiz_score_bps: u32,
    pub total_time_spent: u64,
    pub snapshot_count: u32,
    pub snapshots: Vec<AnalyticsSnapshot>,
}

#[contracttype]
pub enum AnalyticsDataKey {
    Admin,
    History,
    Outcomes(u64),
    LastUpdate,
    Oracle,
    SnapshotCount,
    Snapshot(u64),
    AggregationConfig,
    LastProcessedIndex,
}

#[contract]
pub struct AnalyticsContract;

#[contractimpl]
impl AnalyticsContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&AnalyticsDataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::Admin, &admin);
        let history: Vec<AnalyticsRecord> = Vec::new(&env);
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::History, &history);
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::LastUpdate, &0u64);
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::SnapshotCount, &0u64);
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::LastProcessedIndex, &0u32);
        let default_config = AggregationConfig {
            bucket_size_seconds: 86400,
            max_records_per_aggregation: 100,
        };
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::AggregationConfig, &default_config);
    }

    pub fn record_metrics(
        env: Env,
        total_users: u64,
        active_users: u64,
        total_courses: u64,
        total_completions: u64,
        avg_progress_bps: u32,
        avg_quiz_score_bps: u32,
        total_time_spent: u64,
    ) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::Admin)
            .unwrap();
        admin.require_auth();

        let timestamp = env.ledger().timestamp();
        let mut history: Vec<AnalyticsRecord> = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::History)
            .unwrap_or(Vec::new(&env));

        let record = AnalyticsRecord {
            timestamp,
            total_users,
            active_users,
            total_courses,
            total_completions,
            avg_progress_bps,
            avg_quiz_score_bps,
            total_time_spent,
        };

        history.push_back(record);
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::History, &history);
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::LastUpdate, &timestamp);
    }

    pub fn record_outcomes(env: Env, outcomes: Vec<LearningOutcome>) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::Admin)
            .unwrap();
        admin.require_auth();

        let timestamp = env.ledger().timestamp();
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::Outcomes(timestamp), &outcomes);
    }

    pub fn get_history(env: Env) -> Vec<AnalyticsRecord> {
        env.storage()
            .instance()
            .get(&AnalyticsDataKey::History)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_latest(env: Env) -> Option<AnalyticsRecord> {
        let history: Vec<AnalyticsRecord> = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::History)
            .unwrap_or(Vec::new(&env));
        if history.is_empty() {
            None
        } else {
            Some(history.get(history.len() - 1).unwrap())
        }
    }

    pub fn get_history_range(env: Env, start_time: u64, end_time: u64) -> Vec<AnalyticsRecord> {
        let history: Vec<AnalyticsRecord> = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::History)
            .unwrap_or(Vec::new(&env));
        let mut filtered = Vec::new(&env);

        for i in 0..history.len() {
            let record = history.get(i).unwrap();
            if record.timestamp >= start_time && record.timestamp <= end_time {
                filtered.push_back(record);
            }
        }

        filtered
    }

    pub fn get_outcomes(env: Env, timestamp: u64) -> Option<Vec<LearningOutcome>> {
        env.storage()
            .instance()
            .get(&AnalyticsDataKey::Outcomes(timestamp))
    }

    pub fn get_last_update(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&AnalyticsDataKey::LastUpdate)
            .unwrap_or(0)
    }

    pub fn get_growth_metrics(
        env: Env,
        period1_start: u64,
        period1_end: u64,
        period2_start: u64,
        period2_end: u64,
    ) -> Option<(i64, i64, i64)> {
        let period1_records = Self::get_history_range(env.clone(), period1_start, period1_end);
        let period2_records = Self::get_history_range(env, period2_start, period2_end);

        if period1_records.is_empty() || period2_records.is_empty() {
            return None;
        }

        let p1_last = period1_records.get(period1_records.len() - 1).unwrap();
        let p2_last = period2_records.get(period2_records.len() - 1).unwrap();

        let user_growth = (p2_last.total_users as i64) - (p1_last.total_users as i64);
        let completion_growth =
            (p2_last.total_completions as i64) - (p1_last.total_completions as i64);
        let progress_change = (p2_last.avg_progress_bps as i64) - (p1_last.avg_progress_bps as i64);

        Some((user_growth, completion_growth, progress_change))
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&AnalyticsDataKey::Admin)
            .unwrap()
    }

    // ── Oracle Management ──────────────────────────────────────────

    pub fn set_oracle(env: Env, oracle: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::Admin)
            .unwrap();
        admin.require_auth();
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::Oracle, &oracle);
    }

    pub fn get_oracle(env: Env) -> Option<Address> {
        env.storage().instance().get(&AnalyticsDataKey::Oracle)
    }

    // ── Aggregation Configuration ──────────────────────────────────

    pub fn set_aggregation_config(env: Env, config: AggregationConfig) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::Admin)
            .unwrap();
        admin.require_auth();
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::AggregationConfig, &config);
    }

    pub fn get_aggregation_config(env: Env) -> AggregationConfig {
        env.storage()
            .instance()
            .get(&AnalyticsDataKey::AggregationConfig)
            .unwrap_or(AggregationConfig {
                bucket_size_seconds: 86400,
                max_records_per_aggregation: 100,
            })
    }

    // ── Aggregation ────────────────────────────────────────────────

    pub fn trigger_aggregation(env: Env) -> u64 {
        let admin: Address = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::Admin)
            .unwrap();

        let oracle_opt: Option<Address> = env.storage().instance().get(&AnalyticsDataKey::Oracle);

        let is_oracle = if let Some(oracle) = &oracle_opt {
            let caller = env.current_contract_address();
            caller == *oracle || caller == admin
        } else {
            false
        };

        if !is_oracle {
            admin.require_auth();
        }

        let history: Vec<AnalyticsRecord> = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::History)
            .unwrap_or(Vec::new(&env));

        let last_idx: u32 = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::LastProcessedIndex)
            .unwrap_or(0);

        let config: AggregationConfig = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::AggregationConfig)
            .unwrap_or(AggregationConfig {
                bucket_size_seconds: 86400,
                max_records_per_aggregation: 100,
            });

        let history_len = history.len();
        if last_idx >= history_len {
            panic!("No new records to aggregate");
        }

        let end_idx = (last_idx + config.max_records_per_aggregation).min(history_len);

        let mut total_users: u64 = 0;
        let mut active_users: u64 = 0;
        let mut total_courses: u64 = 0;
        let mut total_completions: u64 = 0;
        let mut sum_avg_progress: u64 = 0;
        let mut sum_avg_quiz: u64 = 0;
        let mut total_time_spent: u64 = 0;
        let mut period_start: u64 = u64::MAX;
        let mut period_end: u64 = 0;
        let mut record_count: u32 = 0;

        for i in last_idx..end_idx {
            let record = history.get(i).unwrap();
            if record.total_users > total_users {
                total_users = record.total_users;
            }
            if record.active_users > active_users {
                active_users = record.active_users;
            }
            if record.total_courses > total_courses {
                total_courses = record.total_courses;
            }
            if record.total_completions > total_completions {
                total_completions = record.total_completions;
            }
            sum_avg_progress += record.avg_progress_bps as u64;
            sum_avg_quiz += record.avg_quiz_score_bps as u64;
            total_time_spent += record.total_time_spent;
            if record.timestamp < period_start {
                period_start = record.timestamp;
            }
            if record.timestamp > period_end {
                period_end = record.timestamp;
            }
            record_count += 1;
        }

        let snapshot_count: u64 = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::SnapshotCount)
            .unwrap_or(0);
        let new_id = snapshot_count + 1;

        let snapshot = AnalyticsSnapshot {
            snapshot_id: new_id,
            period_start,
            period_end,
            total_users,
            active_users,
            total_courses,
            total_completions,
            credentials_issued: total_completions,
            avg_progress_bps: (sum_avg_progress / record_count as u64) as u32,
            avg_quiz_score_bps: (sum_avg_quiz / record_count as u64) as u32,
            total_time_spent,
            record_count,
        };

        env.storage()
            .instance()
            .set(&AnalyticsDataKey::Snapshot(new_id), &snapshot);
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::SnapshotCount, &new_id);
        env.storage()
            .instance()
            .set(&AnalyticsDataKey::LastProcessedIndex, &end_idx);

        if period_end > 0 {
            env.storage()
                .instance()
                .set(&AnalyticsDataKey::LastUpdate, &period_end);
        }

        new_id
    }

    pub fn get_snapshot(env: Env, snapshot_id: u64) -> Option<AnalyticsSnapshot> {
        env.storage()
            .instance()
            .get(&AnalyticsDataKey::Snapshot(snapshot_id))
    }

    pub fn get_snapshot_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&AnalyticsDataKey::SnapshotCount)
            .unwrap_or(0)
    }

    pub fn get_snapshots_paginated(
        env: Env,
        page: u32,
        page_size: u32,
    ) -> Vec<AnalyticsSnapshot> {
        let max_page_size: u32 = 50;
        let actual_size = if page_size > max_page_size {
            max_page_size
        } else {
            page_size
        };

        let total: u64 = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::SnapshotCount)
            .unwrap_or(0);

        if total == 0 {
            return Vec::new(&env);
        }

        let total_pages = ((total as u32) + actual_size - 1) / actual_size;
        let current_page = if page < 1 { 1 } else { page };
        let clamped_page = if current_page > total_pages {
            total_pages
        } else {
            current_page
        };

        let start_id = ((clamped_page - 1) as u64 * actual_size as u64) + 1;
        let end_id = ((clamped_page as u64) * actual_size as u64).min(total);

        let mut result = Vec::new(&env);
        let mut id = start_id;
        while id <= end_id {
            if let Some(snapshot) =
                env.storage().instance().get(&AnalyticsDataKey::Snapshot(id))
            {
                result.push_back(snapshot);
            }
            id += 1;
        }

        result
    }

    pub fn export_analytics(env: Env, start_time: u64, end_time: u64) -> ExportData {
        let total: u64 = env
            .storage()
            .instance()
            .get(&AnalyticsDataKey::SnapshotCount)
            .unwrap_or(0);

        let mut export_snapshots = Vec::new(&env);
        let mut agg_total_users: u64 = 0;
        let mut agg_active_users: u64 = 0;
        let mut agg_total_courses: u64 = 0;
        let mut agg_total_completions: u64 = 0;
        let mut agg_credentials_issued: u64 = 0;
        let mut agg_total_time_spent: u64 = 0;
        let mut sum_avg_progress: u64 = 0;
        let mut sum_avg_quiz: u64 = 0;
        let mut matching_count: u32 = 0;

        let max_export = 365u64.min(total);

        let mut id: u64 = 1;
        while id <= max_export {
            if let Some(snapshot) =
                env.storage().instance().get(&AnalyticsDataKey::Snapshot(id))
            {
                if snapshot.period_end >= start_time && snapshot.period_start <= end_time {
                    if snapshot.total_users > agg_total_users {
                        agg_total_users = snapshot.total_users;
                    }
                    if snapshot.active_users > agg_active_users {
                        agg_active_users = snapshot.active_users;
                    }
                    if snapshot.total_courses > agg_total_courses {
                        agg_total_courses = snapshot.total_courses;
                    }
                    if snapshot.total_completions > agg_total_completions {
                        agg_total_completions = snapshot.total_completions;
                    }
                    agg_credentials_issued += snapshot.credentials_issued;
                    agg_total_time_spent += snapshot.total_time_spent;
                    sum_avg_progress += snapshot.avg_progress_bps as u64;
                    sum_avg_quiz += snapshot.avg_quiz_score_bps as u64;
                    export_snapshots.push_back(snapshot);
                    matching_count += 1;
                }
            }
            id += 1;
        }

        ExportData {
            period_start: start_time,
            period_end: end_time,
            total_users: agg_total_users,
            active_users: agg_active_users,
            total_courses: agg_total_courses,
            total_completions: agg_total_completions,
            credentials_issued: agg_credentials_issued,
            avg_progress_bps: if matching_count > 0 {
                (sum_avg_progress / matching_count as u64) as u32
            } else {
                0
            },
            avg_quiz_score_bps: if matching_count > 0 {
                (sum_avg_quiz / matching_count as u64) as u32
            } else {
                0
            },
            total_time_spent: agg_total_time_spent,
            snapshot_count: matching_count,
            snapshots: export_snapshots,
        }
    }
}
