const express = require('express');
const router = express.Router();
const PushSubscription = require('../models/PushSubscription');
const authMiddleware = require('../middleware/auth');

// 🔒 All routes require auth
router.use(authMiddleware);

// ─── POST /api/notifications/subscribe ────────────────────────────────────────
// Frontend sends its push subscription object here
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'Subscription required' });

    // Upsert — update if exists, create if not
    await PushSubscription.findOneAndUpdate(
      { userId: req.user.id },
      { userId: req.user.id, subscription },
      { upsert: true, new: true }
    );

    res.json({ message: 'Subscribed to push notifications!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/notifications/unsubscribe ────────────────────────────────────
router.delete('/unsubscribe', async (req, res) => {
  try {
    await PushSubscription.findOneAndDelete({ userId: req.user.id });
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;