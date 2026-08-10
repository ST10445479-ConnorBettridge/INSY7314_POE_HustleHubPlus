const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();

cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'organizationName', value: 'HustleHubPlus' },
  { name: 'countryName', value: 'ZA' },
  { name: 'localityName', value: 'Johannesburg' },
  { name: 'stateOrProvinceName', value: 'Gauteng' },
];

cert.setSubject(attrs);
cert.setIssuer(attrs);

cert.setExtensions([
  { name: 'basicConstraints', cA: true },
  { name: 'keyUsage', keyCertSign: true, digitalSignature: true, nonRepudiation: true, keyEncipherment: true, dataEncipherment: true },
  { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
  { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, { type: 7, ip: '10.0.2.2' }, { type: 7, ip: '127.0.0.1' }] },
]);

cert.sign(keys.privateKey, forge.md.sha256.create());

const pemCert = forge.pki.certificateToPem(cert);
const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

fs.writeFileSync(path.join(certDir, 'cert.pem'), pemCert);
fs.writeFileSync(path.join(certDir, 'key.pem'), pemKey);

console.log('Proper self-signed SSL certificate generated successfully in certs/');
console.log('  cert.pem - Certificate file');
console.log('  key.pem  - Private key file');
