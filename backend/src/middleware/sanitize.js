const xss = require('xss');

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
      cleaned[k] = sanitizeNode(v, k);
    }
    return cleaned;
  }
  return shouldSkip(key) ? value : sanitizeString(value);
};

// Applies sanitisation to body, query and params before route handling.
const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNode(req.body, '');
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeNode(req.query, '');
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeNode(req.params, '');
  }
  next();
};

module.exports = { sanitizeInput, sanitizeString };