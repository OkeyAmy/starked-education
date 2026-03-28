const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/starked',
});

const getOverviewStats = async (req, res) => {
  try {
    const totalTransactions = await pool.query('SELECT COUNT(*) FROM activity_logs');
    const recentActivity = await pool.query('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 10');
    const credentialStats = await pool.query("SELECT COUNT(*) FROM activity_logs WHERE type = 'invoke_host_function'");
    
    res.json({
       totalTransactions: parseInt(totalTransactions.rows[0].count),
       credentialIssuances: parseInt(credentialStats.rows[0].count),
       recentActivities: recentActivity.rows,
       updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
};

const getDetailedReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = 'SELECT * FROM activity_logs WHERE timestamp >= $1 AND timestamp <= $2';
    const values = [startDate, endDate];
    const data = await pool.query(query, values);
    
    res.json(data.rows);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

const exportData = async (req, res) => {
  try {
     const data = await pool.query('SELECT * FROM activity_logs LIMIT 1000');
     const jsonContent = JSON.stringify(data.rows, null, 2);
     
     res.setHeader('Content-disposition', 'attachment; filename=activity_export.json');
     res.set('Content-Type', 'application/json');
     res.status(200).send(jsonContent);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
};

module.exports = { getOverviewStats, getDetailedReport, exportData };
