const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Starts ONE shared in-memory MongoDB for the whole test run and records its
// URI so every test worker connects to the same instance.
module.exports = async () => {
  process.env.NODE_ENV = 'test';

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('hustlehub_test');

  const uriFile = path.join(__dirname, '.test-mongodb-uri');
  fs.writeFileSync(uriFile, uri, 'utf8');

  global.__MONGO_MEM_SERVER__ = mongod;
};