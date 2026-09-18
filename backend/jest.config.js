const path = require('path');

module.exports = {
  testEnvironment: 'node',
  globalSetup: path.resolve(__dirname, 'tests/global-setup.js'),
  globalTeardown: path.resolve(__dirname, 'tests/global-teardown.js'),
  setupFilesAfterEnv: [path.resolve(__dirname, 'tests/setup-env.js')],
  maxWorkers: 1,
  testTimeout: 30000,
};