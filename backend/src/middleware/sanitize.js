const xss = require('xss');
const { AppError } = require('./errorHandler');

// Strips HTML/script tags while preserving readable text.
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return xss(value, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe'],
  });
};

const shouldSkip = (key) => /password/i.test(key);

const sanitizeNode = (value, key) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeNode(item, key));
  }
  if (value && typeof value === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.includes('$') || k.includes('.') || ['__proto__', 'constructor', 'prototype'].includes(k)) {
        throw new AppError('Invalid input field', 400);
      }
      cleaned[k] = sanitizeNode(v, k);
    }
    return cleaned;
  }
  return shouldSkip(key) ? value : sanitizeString(value);
};

// Applies sanitisation to body, query and params before route handling.
const sanitizeInput = (req, res, next) => {
  try {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNode(req.body, '');
  }
  if (req.query && typeof req.query === 'object') {
    // Express 5 exposes query as a getter; preserve the sanitised value.
    Object.defineProperty(req, 'query', { value: sanitizeNode(req.query, ''), configurable: true });
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeNode(req.params, '');
  }
  next();
  } catch (err) {
    next(err);
  }
};

module.exports = { sanitizeInput, sanitizeString };
