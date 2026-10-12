const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const envFile = path.join(root, 'backend', '.env');
if (!fs.existsSync(envFile)) {
  let env = fs.readFileSync(path.join(root, 'backend', '.env.example'), 'utf8');
  env = env.replace('replace-with-a-32-plus-character-random-string', crypto.randomBytes(32).toString('hex'));
  fs.writeFileSync(envFile, env, { mode: 0o600 });
  console.log('Created backend/.env with a random signing secret.');
}
const { generateCertificateSet } = require('../backend/scripts/generate-cert');
if (!fs.existsSync(path.join(root, 'backend', 'certs', 'key.pem'))) generateCertificateSet();
console.log('Local configuration ready. Build the frontend, then run npm start.');
