const https = require('https');
const fs = require('fs');
const path = require('path');
const certificate = fs.readFileSync(path.join(__dirname, '..', 'certs', 'cert.pem'));

// Small fetch-like adapter for local HTTPS tests. Verify the generated local
// certificate instead of disabling TLS validation for every request.
module.exports = function trustedFetch(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method, headers, ca: certificate, minVersion: 'TLSv1.2' }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: response.statusCode,
          headers: { get: name => response.headers[name.toLowerCase()] || null },
          json: async () => JSON.parse(text),
          text: async () => text,
        });
      });
      response.on('error', reject);
    });
    request.setTimeout(10000, () => request.destroy(new Error('HTTPS test request timed out')));
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
};
