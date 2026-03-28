-- Activity activity_logs table for blockchain analytics
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    operation_id VARCHAR(100) UNIQUE,
    type VARCHAR(50),
    source_account VARCHAR(60),
    ledger_id BIGINT,
    is_anomaly BOOLEAN DEFAULT FALSE,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for fast queries under 2 seconds requirement
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs (type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_is_anomaly ON activity_logs (is_anomaly);
CREATE INDEX IF NOT EXISTS idx_activity_logs_source_account ON activity_logs (source_account);

-- Suspicious activity tracking
CREATE TABLE IF NOT EXISTS anomalies (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES activity_logs(id),
    reason TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Daily report aggregation
CREATE TABLE IF NOT EXISTS daily_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE UNIQUE,
    total_activities INTEGER,
    anomalies_count INTEGER,
    top_account VARCHAR(60),
    summary JSONB,
    generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
