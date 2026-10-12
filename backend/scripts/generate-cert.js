const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const certDir = path.join(__dirname, '..', 'certs');
const androidPin = path.join(__dirname, '..', '..', 'android', 'app', 'src', 'main', 'res', 'raw', 'server_cert.pem');
function opensslPath() {
  if (process.env.OPENSSL_PATH) return process.env.OPENSSL_PATH;
  const bundled = path.join(process.env.ProgramFiles || 'C:/Program Files', 'Git', 'usr', 'bin', 'openssl.exe');
  return process.platform === 'win32' && fs.existsSync(bundled) ? bundled : 'openssl';
}
function generateCertificateSet() {
  fs.mkdirSync(certDir, { recursive: true });
  execFileSync(opensslPath(), [
    'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-days', '365',
    '-keyout', path.join(certDir, 'key.pem'), '-out', path.join(certDir, 'cert.pem'),
    '-subj', '/C=ZA/ST=Gauteng/L=Johannesburg/O=HustleHubPlus/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1,IP:10.0.2.2',
    '-addext', 'basicConstraints=critical,CA:TRUE',
    '-addext', 'keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign',
    '-addext', 'extendedKeyUsage=serverAuth',
  ], { stdio: 'pipe' });
  syncAndroidPinnedCert();
  console.log('Local HTTPS certificate generated; Android public certificate synchronised.');
}
function syncAndroidPinnedCert(pem) {
  fs.mkdirSync(path.dirname(androidPin), { recursive: true });
  fs.writeFileSync(androidPin, pem || fs.readFileSync(path.join(certDir, 'cert.pem')));
}
module.exports = { generateCertificateSet, syncAndroidPinnedCert, opensslPath };
if (require.main === module) generateCertificateSet();
