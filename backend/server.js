const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = require('./src/app');
const logger = require('./src/utils/logger');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 3443;

const start = async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
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

  server.listen(PORT, () => {
    logger.info(`HustleHub+ API running securely on https://localhost:${PORT}`);
    console.log(`Server running on https://localhost:${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  process.exit(1);
});