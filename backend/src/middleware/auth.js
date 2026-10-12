const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');
const User = require('../models/user');

const JWT_VERIFY_OPTIONS = {
  algorithms: ['HS256'],
  issuer: 'hustlehub-plus',
  audience: 'hustlehub-plus-api',
};

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Access denied. No token provided.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, JWT_VERIFY_OPTIONS);
    if (typeof decoded.id !== 'string' || !/^[a-f\d]{24}$/i.test(decoded.id)) {
      return next(new AppError('Invalid token. Access denied.', 401));
    }
    const user = await User.findById(decoded.id);
    if (!user) return next(new AppError('Account no longer available. Please login again.', 401));
    req.user = user.toSafeObject();
    next();
  } catch (err) {
    if (!['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(err.name)) return next(err);
    logger.warn('Invalid JWT token attempt', {
      ip: req.ip,
      url: req.originalUrl,
    });

    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired. Please login again.', 401));
    }
    return next(new AppError('Invalid token. Access denied.', 401));
  }
};

module.exports = { authenticate };
