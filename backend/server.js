// server.js
// InternOps Backend — Express API Server
// Entry point: sets up middleware stack, mounts routes, starts listener

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const fs           = require('fs');

const db                  = require('./config/db');
const logger              = require('./config/logger');
const { sanitizeBody }    = require('./middleware/validate');

// Route modules
const authRoutes  = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// ------------------------------------------------------------------
// App instance
// ------------------------------------------------------------------
const app  = express();
const PORT = process.env.PORT || 5000;

// ------------------------------------------------------------------
// Security headers (Helmet)
// ------------------------------------------------------------------
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving uploaded files
}));

// ------------------------------------------------------------------
// CORS
// Allows requests from configured frontend origins with credentials
// ------------------------------------------------------------------
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed.`));
    }
  },
  credentials: true,         // required for httpOnly cookie exchange
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ------------------------------------------------------------------
// Request logging (Morgan → Winston)
// ------------------------------------------------------------------
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) },
  skip: () => process.env.NODE_ENV === 'test',
}));

// ------------------------------------------------------------------
// Body parsers
// ------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ------------------------------------------------------------------
// XSS sanitization — cleans all string values in request body
// ------------------------------------------------------------------
app.use(sanitizeBody);

// ------------------------------------------------------------------
// Rate limiting — global: 100 requests / minute per IP
// ------------------------------------------------------------------
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000,
  max:      parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many requests. Please wait and try again.',
  },
});
app.use('/api/', globalLimiter);

// Stricter limiter for auth endpoints — 10 attempts / 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please wait 15 minutes.',
  },
});
app.use('/api/auth/login', authLimiter);

// ------------------------------------------------------------------
// Static file serving for uploaded files
// ------------------------------------------------------------------
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// ------------------------------------------------------------------
// Health check endpoint (unauthenticated — used by load balancers)
// ------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    const serverTime = await db.healthCheck();
    return res.status(200).json({
      success: true,
      status:  'healthy',
      serverTime,
      env:     process.env.NODE_ENV,
    });
  } catch (err) {
    logger.error('Health check failed', { error: err.message });
    return res.status(503).json({
      success: false,
      status:  'unhealthy',
      message: 'Database connection failed.',
    });
  }
});

// ------------------------------------------------------------------
// API Routes
// ------------------------------------------------------------------
app.use('/api/auth',  authRoutes);
app.use('/api/admin', adminRoutes);

// Phase 2 routes (added in next phase)
// app.use('/api/mentor', mentorRoutes);
// app.use('/api/intern', internRoutes);
// app.use('/api/upload', uploadRoutes);

// ------------------------------------------------------------------
// 404 handler — catches unmatched routes
// ------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ------------------------------------------------------------------
// Global error handler
// Catches errors thrown by route handlers (next(err))
// ------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // CORS errors from our cors() config
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // Multer file size errors (Phase 2)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: `File too large. Maximum size: ${process.env.MAX_FILE_SIZE_MB || 10}MB.`,
    });
  }

  logger.error('Unhandled error', {
    method:  req.method,
    url:     req.originalUrl,
    error:   err.message,
    stack:   process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  return res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message,
  });
});

// ------------------------------------------------------------------
// Start server
// ------------------------------------------------------------------
const startServer = async () => {
  try {
    // Verify DB connection before accepting traffic
    await db.healthCheck();
    logger.info('Database connection established.');

    app.listen(PORT, () => {
      logger.info(`InternOps API running on port ${PORT}`, {
        env:  process.env.NODE_ENV,
        port: PORT,
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
};

startServer();

module.exports = app; // exported for Jest tests
