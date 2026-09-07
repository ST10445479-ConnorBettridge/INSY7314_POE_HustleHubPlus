const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { generateCertificateSet, syncAndroidPinnedCert } = require('./generate-cert');

const certDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

const pfxPath = path.join(process.env.TEMP || '/tmp', 'hustlehub.pfx');

try {
  if (fs.existsSync(pfxPath)) {
    execSync(`openssl pkcs12 -in "${pfxPath}" -nocerts -out "${path.join(certDir, 'key.pem')}" -passin pass:hustlehub -passout pass:`, { stdio: 'pipe' });
    execSync(`openssl pkcs12 -in "${pfxPath}" -clcerts -nokeys -out "${path.join(certDir, 'cert.pem')}" -passin pass:hustlehub`, { stdio: 'pipe' });
    syncAndroidPinnedCert();
    console.log('Certificates extracted from PFX successfully');
  } else {
    throw new Error('PFX not found, using Node.js fallback');
  }
} catch (err) {
  console.log('OpenSSL not available or PFX missing, using Node.js generated certs');
  generateCertificateSet();
}