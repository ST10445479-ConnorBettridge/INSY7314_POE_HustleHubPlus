// A disposable replica set and HTTPS server make Newman runs repeatable without
// changing development data or consuming the development server's rate budget.
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const newman = require('newman');
const root = path.join(__dirname, '..', '..');
const evidence = path.join(root, 'docs', 'evidence');

async function run() {
  process.env.NODE_ENV = 'development';
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  const database = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.MONGODB_URI = database.getUri('hustlehub_acceptance');
  const { connectDB, disconnectDB } = require('../src/config/db');
  const app = require('../src/app');
  let server;
  try {
    await connectDB(process.env.MONGODB_URI);
    await new Promise((resolve, reject) => {
      const seed = spawn(process.execPath, [path.join(__dirname, 'seed.js')], { cwd: path.join(root, 'backend'), env: process.env, stdio: 'ignore' });
      seed.on('error', reject);
      seed.on('exit', code => code === 0 ? resolve() : reject(new Error(`Acceptance seed failed (${code})`)));
    });
    const cert = path.join(root, 'backend', 'certs', 'cert.pem');
    server = https.createServer({ key: fs.readFileSync(path.join(root, 'backend', 'certs', 'key.pem')), cert: fs.readFileSync(cert), minVersion: 'TLSv1.2' }, app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    fs.mkdirSync(evidence, { recursive: true });
    await new Promise((resolve, reject) => newman.run({
      collection: path.join(root, 'HustleHub+ Postman Collection.json'),
      envVar: [{ key: 'baseUrl', value: `https://127.0.0.1:${server.address().port}` }],
      sslExtraCaCerts: cert,
      reporters: ['cli', 'junit'],
      reporter: { junit: { export: path.join(evidence, 'newman.xml') } },
    }, (error, summary) => {
      if (error) return reject(error);
      if (summary.run.failures.length) return reject(new Error(`${summary.run.failures.length} Newman failures`));
      console.log(`Newman verified: ${summary.run.stats.requests.total} requests, ${summary.run.stats.assertions.total} assertions, zero failures.`);
      resolve();
    }));
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await disconnectDB();
    await database.stop();
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
