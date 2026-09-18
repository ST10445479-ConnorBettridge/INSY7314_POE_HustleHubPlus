process.env.JWT_SECRET = 'test-jwt-secret-key-32-chars-minimum-length!';
process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4';

module.exports = {
  // This file is loaded by Jest before running tests.
  // It sets a test-only JWT_SECRET, NODE_ENV and a reduced bcrypt cost so the
  // test suite runs fast while keeping full-strength hashing in production.
};