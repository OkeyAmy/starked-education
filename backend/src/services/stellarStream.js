const { Server } = require('@stellar/stellar-sdk');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/starked',
});

// Stellar Testnet server
const server = new Server('https://horizon-testnet.stellar.org');

const startStellarStream = () => {
  console.log('Monitoring Stellar blockchain for new activities...');

  // Stream operations to detect credential issuances, course creations, etc.
  // In a real scenario, we'd filters by account or contract ID.
  server.operations()
    .cursor('now')
    .stream({
      onmessage: async (operation) => {
        try {
          // Detect relevant operations (e.g., contract calls)
          if (operation.type === 'invoke_host_function') {
             await processContractActivity(operation);
          }
          
          // Log all operations for general analytics
          await saveActivityRecord(operation);
        } catch (error) {
          console.error('Error processing operation:', error);
        }
      },
      onerror: (error) => {
        console.error('Stellar stream error:', error);
      }
    });
};

const processContractActivity = async (op) => {
  // Logic to parse contract calls and record analytics
  // e.g. Credential issuance, Course creation
  const activityData = {
    activity_type: 'contract_call',
    address: op.source_account,
    timestamp: new Date(op.created_at).getTime(),
    details: op.id
  };
  
  // Here we would perform anomaly detection before saving
  if (isAnomaly(activityData)) {
    console.warn('Suspicious activity detected:', activityData);
    await logAnomaly(activityData);
  }

  await saveActivityRecord(op);
};

const saveActivityRecord = async (op) => {
  const query = 'INSERT INTO activity_logs (operation_id, type, source_account, ledger, timestamp) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING';
  const values = [op.id, op.type, op.source_account, op.ledger_id, op.created_at];
  
  try {
     await pool.query(query, values);
  } catch (err) {
     if (err.code !== '42P01') { // Ignore "table does not exist" for demo if not migrated yet
       console.error('DB Error saving activity:', err.message);
     }
  }
};

const isAnomaly = (data) => {
  // Simple anomaly detection rule for demo: 
  // e.g. high frequency of requests or specific source accounts
  return false; 
};

const logAnomaly = async (data) => {
   // Logic to log suspicious activity for reporting
};

module.exports = { startStellarStream };
