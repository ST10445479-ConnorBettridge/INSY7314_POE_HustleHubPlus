const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const unsignedToken = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

describe('Security hardening - privilege escalation', () => {
  it('rejects self-registration with admin role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Hacker', email: 'hacker@example.com', password: 'Hacker1!', role: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Role/);
  });

  it('rejects registration with unknown extra fields (mass assignment)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Extra Fields',
        email: 'extra@example.com',
        password: 'ExtraPass1!',
        role: 'freelancer',
        id: 999,
        isAdmin: true,
        createdAt: 'HACKED',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.id).not.toBe(999);
    expect(res.body.data.user).not.toHaveProperty('isAdmin');
    expect(res.body.data.user).not.toHaveProperty('createdAt', 'HACKED');
  });
});

describe('Security hardening - JWT attacks', () => {
  it('rejects a token signed with algorithm "none"', async () => {
    const token = unsignedToken({ id: 1, email: 'x@example.com', role: 'admin', name: 'X' });

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const token = jwt.sign(
      { id: 1, email: 'x@example.com', role: 'client', name: 'X' },
      'attacker-controlled-secret',
      { algorithm: 'HS256' }
    );

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const token = jwt.sign(
      { id: 1, email: 'x@example.com', role: 'client', name: 'X' },
      process.env.JWT_SECRET,
      {
        expiresIn: '-10s',
        issuer: 'hustlehub-plus',
        audience: 'hustlehub-plus-api',
      }
    );

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('rejects a token with a missing audience/issuer (wrong context)', async () => {
    const token = jwt.sign(
      { id: 1, email: 'x@example.com', role: 'client', name: 'X' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});

describe('Security hardening - request smuggling / malformed input', () => {
  it('returns a controlled 400 for malformed JSON (no stack trace leak)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken"');

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Invalid JSON payload');
    expect(res.body.message).not.toContain('SyntaxError');
    expect(res.body).not.toHaveProperty('stack');
  });

  it('returns 413 for oversized request bodies', async () => {
    const big = JSON.stringify({ email: 'a'.repeat(30000), password: 'b'.repeat(30000) });

    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(big);

    expect(res.status).toBe(413);
  });
});

describe('Security hardening - SQL injection resistance', () => {
  it('stores and escapes SQL injection payloads without crashing the API', async () => {
    const payloads = [
      "Robert'); DROP TABLE users;--",
      "' OR '1'='1",
      "1; SELECT * FROM users",
      "${7*7}",
    ];

    for (const payload of payloads) {
      const email = `sqli${Math.random().toString(36).slice(2)}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: payload, email, password: 'SqliPass1!', role: 'freelancer' });

      expect(res.status).toBe(201);
      expect(res.body.data.user.name).not.toContain('<script>');
    }

    const check = await request(app)
      .post('/api/auth/login')
      .send({ email: "x' OR '1'='1", password: "' OR '1'='1" });
    expect(check.status).toBe(400);

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: "admin'--", password: "anything' OR '1'='1" });
    expect(login2.status).toBe(400);

    const login3 = await request(app)
      .post('/api/auth/login')
      .send({ email: "valid@example.com'--", password: "anything' OR '1'='1" });
    expect(login3.status).toBe(400);
  });
});

describe('Security hardening - response headers', () => {
  it('sends standard security headers', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['referrer-policy']).toBeDefined();
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('does not leak internal error details for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Route /api/unknown not found');
    expect(res.body).not.toHaveProperty('stack');
  });
});
