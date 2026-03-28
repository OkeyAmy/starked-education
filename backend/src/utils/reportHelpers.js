const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/starked',
});

const getReportStats = async () => {
    try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const totalActivity = await pool.query('SELECT COUNT(*) FROM activity_logs WHERE timestamp >= $1', [last24h]);
        const anomalies = await pool.query('SELECT COUNT(*) FROM activity_logs WHERE is_anomaly = true AND timestamp >= $1', [last24h]);
        const topAccount = await pool.query('SELECT source_account, COUNT(*) as activity_count FROM activity_logs WHERE timestamp >= $1 GROUP BY source_account ORDER BY activity_count DESC LIMIT 1', [last24h]);
        
        return {
            totalActivityCount: totalActivity.rows[0].count,
            anomaliesFound: parseInt(anomalies.rows[0].count),
            topActiveAccount: topAccount.rows[0] ? topAccount.rows[0].source_account : 'None',
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
       console.error('Error generating report stats:', error);
       return { totalActivityCount: 0, anomaliesFound: 0, topActiveAccount: 'None' };
    }
};

module.exports = { getReportStats };
