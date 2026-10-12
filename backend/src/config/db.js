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

    // Development convenience: spin up a persistent local MongoDB replica set with zero external
    // setup. Its connection URI is recorded in .mongo-data/uri.txt so companion
    // scripts (e.g. the seeder) can target this same running instance.
    const { MongoMemoryReplSet } = require('mongodb-memory-server');
    const dbPath = path.join(DATA_DIR, 'db');
    fs.mkdirSync(dbPath, { recursive: true });
    memSrv = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
      instanceOpts: [{ dbPath, port: Number(process.env.MONGO_DEV_PORT) || 27018 }],
    });
    uri = memSrv.getUri('hustlehub');
    logger.info('Using a local MongoDB replica set with persistent development storage');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(URI_FILE, uri, 'utf8');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') {
    throw new Error('MongoDB must be a replica set or sharded cluster to support booking transactions');
  }
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  logger.info('MongoDB connected successfully');
  return uri;
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memSrv) {
    await memSrv.stop({ doCleanup: false, force: false });
    memSrv = null;
    try {
      fs.unlinkSync(URI_FILE);
    } catch (err) {
      // already gone
    }
  }
};

module.exports = { connectDB, disconnectDB, URI_FILE };
