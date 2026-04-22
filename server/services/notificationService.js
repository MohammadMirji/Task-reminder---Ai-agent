const cron = require('node-cron');
const webpush = require('web-push');
const Task = require('../models/Task');
const PushSubscription = require('../models/PushSubscription');

function startNotificationCron() {
  if (!process.env.VAPID_EMAIL || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('Push notifications are disabled: VAPID keys/email not configured.');
    return;
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    try {
      const dueTasks = await Task.find({
        notifyAt: { $gte: oneMinuteAgo, $lte: now }, // ← look BACK not forward
        notified: false,
        status: { $ne: 'completed' },
      });

      if (dueTasks.length > 0) {
        console.log(`${dueTasks.length} task(s) due. Sending notifications...`);
      }

      for (const task of dueTasks) {
        const pushDoc = await PushSubscription.findOne({ userId: task.userId });
        if (!pushDoc) {
          console.log(`No subscription found for user: ${task.userId}`);
          continue;
        }

        const isExactlyDue =
          task.dueDate &&
          Math.abs(new Date(task.dueDate) - new Date(task.notifyAt)) < 60000;

        const payload = JSON.stringify({
          title: isExactlyDue ? 'Task Due Now' : 'Task Reminder',
          body: isExactlyDue
            ? `"${task.title}" is due now!`
            : `"${task.title}" is due at ${new Date(task.dueDate).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
          icon: '/logo192.png',
          badge: '/logo192.png',
          taskId: task._id,
        });

        try {
          await webpush.sendNotification(pushDoc.subscription, payload);
          await Task.findByIdAndUpdate(task._id, { notified: true });
          console.log(`Notification sent: "${task.title}"`);
        } catch (pushErr) {
          console.error(`Push error: ${pushErr.message}`);
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            console.log('Removing expired subscription...');
            await PushSubscription.findOneAndDelete({ userId: task.userId });
          }
        }
      }
    } catch (err) {
      console.error('Cron error:', err.message);
    }
  });

  console.log('Notification cron job started');
}

module.exports = { startNotificationCron };