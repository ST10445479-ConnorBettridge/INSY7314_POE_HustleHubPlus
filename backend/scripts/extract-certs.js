const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const certDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

const pfxPath = path.join(process.env.TEMP || '/tmp', 'hustlehub.pfx');

function generateCertsWithNode() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  fs.writeFileSync(path.join(certDir, 'key.pem'), privateKey.export({ type: 'pkcs1', format: 'pem' }));
  fs.writeFileSync(path.join(certDir, 'cert.pem'), publicKey.export({ type: 'spki', format: 'pem' }));
  console.log('Certs generated (development mode - cert is public key)');
}

try {
  if (fs.existsSync(pfxPath)) {
    execSync(`openssl pkcs12 -in "${pfxPath}" -nocerts -out "${path.join(certDir, 'key.pem')}" -passin pass:hustlehub -passout pass:`, { stdio: 'pipe' });
    execSync(`openssl pkcs12 -in "${pfxPath}" -clcerts -nokeys -out "${path.join(certDir, 'cert.pem')}" -passin pass:hustlehub`, { stdio: 'pipe' });
    console.log('Certificates extracted from PFX successfully');
  } else {
    throw new Error('PFX not found, using Node.js fallback');
  }
} catch (err) {
  console.log('OpenSSL not available or PFX missing, using Node.js generated certs');
  generateCertsWithNode();
}
