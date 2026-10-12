const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const app = require('./src/app');
const logger = require('./src/utils/logger');
const { connectDB, disconnectDB } = require('./src/config/db');

const PORT = process.env.PORT || 3443;

const start = async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace-with-')) {
    console.error('FATAL: JWT_SECRET must be set to a strong random value (32+ characters) in .env');
    process.exit(1);
  }

  await connectDB();

  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem')),
    minVersion: 'TLSv1.2',
  };

  const server = https.createServer(sslOptions, app);
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000).unref();
    await new Promise(resolve => server.close(resolve));
    await disconnectDB();
    clearTimeout(timeout);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  server.on('error', async err => {
    logger.error('HTTPS server failed', { error: err.message });
    await disconnectDB();
    process.exit(1);
  });

  server.listen(PORT, () => {
    logger.info(`HustleHub+ API running securely on https://localhost:${PORT}`);
    console.log(`Server running on https://localhost:${PORT}`);
  });
};

start().catch(async (err) => {
  console.error('Failed to start server:', err.message);
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  await disconnectDB();
  process.exit(1);
});
