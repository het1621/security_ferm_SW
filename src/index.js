require('dotenv').config();
const { runStartupSecurityCheck } = require('./utils/startupSecurityCheck');
runStartupSecurityCheck();
const express = require('express');
const logger = require('./utils/logger');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createLogger } = require('./utils/secureLogger');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS: Restrict origins to prevent CSRF attacks
if (process.env.NODE_ENV === 'production') {
  // In Electron: frontend and backend are in same process
  // Allow localhost only, reject cross-domain requests
  const allowedOrigins = [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
  ];

  app.use(cors({
    origin: function(origin, callback) {
      // Allow non-browser requests (mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject disallowed origins
      logger.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-master-passcode'],
    maxAge: 86400  // Cache CORS policy for 24 hours
  }));
} else {
  // Development: allow localhost and 127.0.0.1
  app.use(cors({
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      if (origin.startsWith('http://localhost:') || 
          origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-master-passcode']
  }));
}
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500
});

// Stricter limits for sensitive operations (Issue #13)
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 15               // Max 15 requests per minute
});

app.use('/api/payroll', strictLimiter);
app.use('/api/invoices', strictLimiter);
app.use('/api/bank-reconciliation', strictLimiter);
app.use('/api/', limiter);

// Serve static files (documents/uploads)
const path = require('path');
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging — secure logger redacts sensitive fields (passwords, Aadhaar, bank details)
app.use(createLogger());

// Routes
const authRoutes = require('./routes/auth');
const employeesRoutes = require('./routes/employees');
const clientsRoutes = require('./routes/clients');
const attendanceRoutes = require('./routes/attendance');
const payrollRoutes = require('./routes/payroll');
const invoicesRoutes = require('./routes/invoices');
const expensesRoutes = require('./routes/expenses');
const settingsRoutes = require('./routes/settings');
const reportsRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');
const ledgerRoutes = require('./routes/ledger');
const vendorsRoutes = require('./routes/vendors');
const { startBackupJob } = require('./utils/backupJob');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/recurring-expenses', require('./routes/recurring_expenses'));
app.use('/api/errors', require('./routes/errors'));
app.use('/api/statements', require('./routes/statements'));
app.use('/api/pl-account', require('./routes/pl-account'));
app.use('/api/vouchers', require('./routes/vouchers'));
app.use('/api/bank-accounts', require('./routes/bank-accounts'));
app.use('/api/balance-sheet', require('./routes/balance-sheet'));
app.use('/api/bank-reconciliation', require('./routes/bank-reconciliation'));
app.use('/api/recurring-invoices', require('./routes/recurring-invoices'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

const { startScheduledJobs } = require('./utils/scheduledJobs');

// Global error handler — never leak stack traces in production
app.use(async (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    logger.error('Unhandled Error:', err.message, err.stack);
  } else {
    // In production: log only the message, not the stack (which may contain data)
    logger.error(`[ERROR] ${new Date().toISOString()} | ${req.method} ${req.url} | ${err.message}`);
  }
  
  // Try to log the error to DB
  try {
    const { query } = require('./database/connection');
    const client_ip = req.ip || req.connection.remoteAddress;
    let user_id = null;
    if (req.user && req.user.userId) user_id = req.user.userId;
    
    await query(
      `INSERT INTO error_logs (error_type, error_message, stack_trace, endpoint, method, user_id, client_ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        err.name || 'ServerError',
        err.message || 'Unknown server error',
        err.stack || null,
        req.originalUrl || req.url,
        req.method,
        user_id,
        client_ip
      ]
    );
  } catch (dbErr) {
    logger.error('Failed to save error log to DB:', dbErr);
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

// Serve React frontend
app.use(express.static(path.join(__dirname, '..', 'frontend-dist')));

// Catch-all route for React SPA, except API routes
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'frontend-dist', 'index.html'));
});

// Initialize scheduled cron jobs
startScheduledJobs();
startBackupJob();

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`\n🚀 Security Firm API Server running on port ${PORT} (0.0.0.0)`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🗄️  Database: SQLite @ ${process.env.DB_PATH || 'database.sqlite'}\n`);
});

module.exports = app;
