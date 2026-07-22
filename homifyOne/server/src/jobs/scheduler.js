const cron = require('node-cron');
const {
  sendDeadlineReminders,
  flagOverdueSelections,
  flagStalePurchaseOrders,
} = require('./scheduledJobs');

const DAILY_SCHEDULE = '30 11 * * *';

module.exports = function initScheduledJobs() {
  cron.schedule(DAILY_SCHEDULE, async () => {
    try {
      const count = await sendDeadlineReminders();
      console.log(`[cron] sendDeadlineReminders: ${count} reminder(s) sent`);
    } catch (err) {
      console.error('[cron] sendDeadlineReminders failed:', err.message);
    }
  });

  cron.schedule(DAILY_SCHEDULE, async () => {
    try {
      const count = await flagOverdueSelections();
      console.log(`[cron] flagOverdueSelections: ${count} plot(s) flagged`);
    } catch (err) {
      console.error('[cron] flagOverdueSelections failed:', err.message);
    }
  });

  cron.schedule(DAILY_SCHEDULE, async () => {
    try {
      const count = await flagStalePurchaseOrders();
      console.log(`[cron] flagStalePurchaseOrders: ${count} order(s) flagged`);
    } catch (err) {
      console.error('[cron] flagStalePurchaseOrders failed:', err.message);
    }
  });

  console.log('Scheduled jobs initialised: deadline reminders, overdue flagging, stale PO alerts (daily at 11:30).');
};
