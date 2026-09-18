const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let memSrv = null;

const DATA_DIR = path.join(__dirname, '..', '..', '.mongo-data');
const URI_FILE = path.join(DATA_DIR, 'uri.txt');

const connectDB = async (uriOverride) => {
  let uri = uriOverride || process.env.MONGODB_URI;

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI must be set in .env when NODE_ENV=production');
    }

    // Development convenience: spin up a real MongoDB instance with zero external
    // setup. Its connection URI is recorded in .mongo-data/uri.txt so companion
    // scripts (e.g. the seeder) can target this same running instance.
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memSrv = await MongoMemoryServer.create();
    uri = memSrv.getUri('hustlehub');
    logger.info('No MONGODB_URI set - using an in-memory MongoDB instance');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(URI_FILE, uri, 'utf8');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  logger.info('MongoDB connected successfully');
  return uri;
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memSrv) {
    await memSrv.stop();
    memSrv = null;
    try {
      fs.unlinkSync(URI_FILE);
    } catch (err) {
      // already gone
    }
  }
};

module.exports = { connectDB, disconnectDB, URI_FILE };