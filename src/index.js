require('dotenv').config();
const { runStartupSecurityCheck } = require('./utils/startupSecurityCheck');
runStartupSecurityCheck();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createLogger } = require('./utils/secureLogger');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500
});
app.use('/api/', limiter);

// Serve static files (documents/uploads)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging — secure logger redacts sensitive fields (passwords, Aadhaar, bank details)
app.use(createLogger());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/settings', require('./routes/settings'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

const { startScheduledJobs } = require('./utils/scheduledJobs');

// Global error handler — never leak stack traces in production
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    console.error('Unhandled Error:', err.message, err.stack);
  } else {
    // In production: log only the message, not the stack (which may contain data)
    console.error(`[ERROR] ${new Date().toISOString()} | ${req.method} ${req.url} | ${err.message}`);
  }
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Initialize scheduled cron jobs
startScheduledJobs();

app.listen(PORT, () => {
  console.log(`\n🚀 Security Firm API Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}\n`);
});

module.exports = app;
