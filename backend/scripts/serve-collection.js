#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const COLLECTION_FILE = path.join(ROOT, 'HustleHub+ Postman Collection.json');
const PORT = process.env.PORT || 8098;

const MIME = {
  '.json': 'application/json',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

// Never expose dotfiles (.env, .git, ...) or TLS secrets / logs over HTTP.
const SECRET_RE = /(^|\/)\.[^/\\]+($|[\/\\])|(^|[\/\\])certs([\/\\]|$)|(^|[\/\\])logs([\/\\]|$)/i;

http
  .createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      return res.end('method not allowed');
    }

    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p === '') {
      p = '/HustleHub+ Postman Collection.json';
    }

    if (SECRET_RE.test(p)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('forbidden');
    }

    const rel = p.replace(/^[\\/]+/, '');
    const fp = path.resolve(ROOT, rel);
    if (!fp.startsWith(ROOT + path.sep) && fp !== ROOT) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('forbidden');
    }
    if (!fs.existsSync(fp) || !fs.statSync(fp).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('not found: ' + p);
    }

    res.writeHead(200, {
      'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream',
      'Content-Length': fs.statSync(fp).size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(fp).pipe(res);
  })
  .listen(PORT, () => {
    console.log(`Serving HustleHub+ collection on http://localhost:${PORT}/`);
    console.log('  Import URL: http://localhost:' + PORT + '/HustleHub%2B%20Postman%20Collection.json');
  });