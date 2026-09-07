// Test-only environment. Runs before the suites are loaded so that server.js and
// the auth middleware always see a valid configuration, even on a clean checkout
// where no .env file exists yet.
//
// dotenv does not overwrite variables that are already set, so a developer with a
// real .env still gets their own values.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-only-jwt-secret-not-used-outside-the-test-suite';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
