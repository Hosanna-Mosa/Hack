require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const connectDB = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Optional quiet mode to suppress noisy startup logs and warnings
const QUIET_STARTUP = String(process.env.QUIET_STARTUP || '').toLowerCase() === 'true';
if (QUIET_STARTUP) {
  // Suppress Node process warnings
  process.on('warning', () => {});
  // Suppress info/warn chatter from dependencies (keep error and log)
  console.info = () => {};
  console.warn = () => {};
}

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN ||
    'https://hack-i6v3.onrender.com/api',
    'https://school-pannel.onrender.com',
    'https://hack-parent-portal.onrender.com',
    'http://localhost:5173',
    'http://localhost:8081',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:8082'
  ],
  credentials: true
}));

// Compression middleware
app.use(compression());

// Logging middleware (skip when quiet)
if (!QUIET_STARTUP) {
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api', routes);

// Root route via controller
const { root, notFound } = require('./controllers/healthController');
app.get('/', root);

// 404 handler via controller
app.use('*', notFound);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Register scheduled jobs
try {
  const { registerMonthlyAttendanceEmailJob } = require('./jobs/monthlyAttendanceEmail');
  registerMonthlyAttendanceEmailJob();
} catch (err) {
  console.error('Failed to register monthly email job:', err.message);
}

try {
  const { registerDailyMidDayMealEmailJob } = require('./jobs/dailyMidDayMealEmail');
  registerDailyMidDayMealEmailJob();
} catch (err) {
  console.error('Failed to register daily mid-day meal email job:', err.message);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  if (!QUIET_STARTUP) console.log(`Error: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  if (!QUIET_STARTUP) console.log(`Error: ${err.message}`);
  process.exit(1);
});

module.exports = app;
