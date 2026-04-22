require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
const { startNotificationCron } = require('./services/notificationService'); // ← NEW

const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications'); // ← NEW

const app = express();

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set('trust proxy', 1);
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients and curl requests with no Origin header
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes); // ← NEW

app.get('/', (req, res) => res.send('AI Task API is running!'));
app.get('/health', (req, res) => res.status(200).json({ ok: true }));

const PORT = process.env.PORT || 5000;
let cronStarted = false;

async function connectMongoWithRetry() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Database connection skipped.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    if (!cronStarted) {
      startNotificationCron();
      cronStarted = true;
    }
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Retrying MongoDB connection in 10 seconds...');
    setTimeout(connectMongoWithRetry, 10000);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectMongoWithRetry();
});