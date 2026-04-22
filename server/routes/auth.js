const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const { normalizeOrigin } = require('../utils/env');

function getFrontendUrl() {
  if (process.env.FRONTEND_URL) return normalizeOrigin(process.env.FRONTEND_URL);
  if (process.env.CLIENT_URL) return normalizeOrigin(process.env.CLIENT_URL);
  if (process.env.CLIENT_URLS) {
    const firstUrl = process.env.CLIENT_URLS
      .split(',')
      .map((url) => normalizeOrigin(url))
      .find(Boolean);
    if (firstUrl) return firstUrl;
  }
  return null;
}

// Helper: generate JWT
function generateToken(user) {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: 'Email already registered' });

    // Hash password
    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({ name, email, password: hashed });
    const token = generateToken(user);

    res.status(201).json({ token, user: { id: user._id, name, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: 'Invalid email or password' });

    // Google OAuth users have no password
    if (!user.password)
      return res.status(400).json({ error: 'Please login with Google' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: 'Invalid email or password' });

    const token = generateToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/google ─────────────────────────────────────────────────────
// Redirects user to Google's login page
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// ─── GET /api/auth/google/callback ────────────────────────────────────────────
// Google redirects back here after login
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user);
    const frontendUrl = getFrontendUrl();
    if (!frontendUrl) {
      return res.status(500).json({
        error: 'FRONTEND_URL is not configured on the server.',
      });
    }
    // Send token to frontend via URL param (React will grab it)
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

module.exports = router;
