const cron = require('node-cron');
const { getReportStats } = require('../utils/reportHelpers');

const startScheduledJobs = () => {
  console.log('Automated reporting system activated.');

  // Schedule a daily report at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Generating daily DAO analytics report...');
      const analytics = await getReportStats();
      
      // Send alerts if anomalies are found
      if (analytics.anomaliesFound > 0) {
        await sendAlert(analytics.anomaliesFound);
      }
      
      console.log('Daily report completed successfully.');
    } catch (error) {
      console.error('Daily report generation failed:', error);
    }
  });

  // Schedule a weekly cleanup task
  cron.schedule('0 0 * * 0', () => {
    console.log('Running weekly data cleanup...');
    // cleanup logic here
  });
};

const sendAlert = async (anomalyCount) => {
  // Logic to send notification via email/slack
  console.log(`ALERT: ${anomalyCount} anomalies detected in the last 24 hours.`);
};

module.exports = { startScheduledJobs };
