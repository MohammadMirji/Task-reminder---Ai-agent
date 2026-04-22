require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
const { startNotificationCron } = require('./services/notificationService');
const { parseOriginList, normalizeOrigin } = require('./utils/env');

const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');

const app = express();

const allowedOrigins = parseOriginList(
  process.env.CLIENT_URLS || '',
  process.env.CLIENT_URL || '',
  process.env.FRONTEND_URL || ''
);

app.set('trust proxy', 1);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${normalizedOrigin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());

const sessionSecret =
  process.env.JWT_SECRET || 'temporary-dev-secret-change-in-production';

if (!process.env.JWT_SECRET) {
  console.warn(
    'JWT_SECRET is not set. Using fallback secret; set JWT_SECRET in Railway variables.'
  );
}

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => res.send('AI Task API is running!'));
app.get('/health', (req, res) => res.status(200).json({ ok: true }));

const PORT = process.env.PORT || 5000;
let cronStarted = false;

function startBackgroundServices() {
  if (cronStarted) return;

  const started = startNotificationCron();
  cronStarted = started || cronStarted;
}

async function connectMongoWithRetry() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Database connection skipped.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');
    startBackgroundServices();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Retrying MongoDB connection in 10 seconds...');
    setTimeout(connectMongoWithRetry, 10000);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  if (allowedOrigins.length > 0) {
    console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  } else {
    console.warn(
      'No CORS origins configured. Set CLIENT_URLS or CLIENT_URL in production.'
    );
  }

  connectMongoWithRetry();
});
