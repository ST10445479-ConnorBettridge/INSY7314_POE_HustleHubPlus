const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ quiet: true });
const authRoutes = require('./routes/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

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

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
if (!isTest) app.use(morgan('short'));

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

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'HustleHub+ API is running' });
});

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

app.use('/api/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
