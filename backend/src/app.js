const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const gigRoutes = require('./routes/gigs');
const bookingRoutes = require('./routes/bookings');
const incomeRoutes = require('./routes/income');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/sanitize');

const app = express();

const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

const limiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        status: 'error',
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
      },
    });

const authLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        status: 'error',
        statusCode: 429,
        message: 'Too many authentication attempts. Please try again later.',
      },
    });

const bookingLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        status: 'error',
        statusCode: 429,
        message: 'Too many booking requests. Please slow down.',
      },
    });

app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (!isTest) app.use(morgan('short'));

// Sanitisation: strip NoSQL operator injection and HTML/script payloads.
app.use(mongoSanitize());
app.use(sanitizeInput);

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Invalid JSON payload',
    });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      status: 'error',
      statusCode: 413,
      message: 'Request body too large',
    });
  }
  next(err);
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/bookings', bookingLimiter);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'HustleHub+ API is running' });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the HustleHub+ API',
    data: {
      name: 'HustleHub+',
      description: 'A secure freelance marketplace platform API',
      baseUrl: '/api',
      endpoints: {
        health: 'GET /api/health',
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile (Bearer token required)',
        gigs: 'GET /api/gigs (public browse)',
        createGig: 'POST /api/gigs (freelancer)',
        bookings: 'POST /api/bookings (client)',
        income: 'GET /api/income (freelancer)',
      },
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/income', incomeRoutes);

// Serve the built React frontend when it exists (full-stack single-origin mode).
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Welcome to the HustleHub+ API',
      data: {
        name: 'HustleHub+',
        description: 'A secure freelance marketplace platform API',
        baseUrl: '/api',
        endpoints: {
          health: 'GET /api/health',
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          profile: 'GET /api/auth/profile (Bearer token required)',
        },
      },
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;