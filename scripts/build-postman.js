const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const sleep = (s) => new Promise((r) => setTimeout(r, s));

const req = (method, rawPath, opts = {}) => {
  const headers = [{ key: 'Content-Type', value: 'application/json' }];
  if (opts.token) headers.push({ key: 'Authorization', value: `Bearer {{${opts.token}}}` });
  const [pathPart, queryPart] = rawPath.split('?');
  const url = {
    raw: `{{baseUrl}}${rawPath}`,
    host: ['{{baseUrl}}'],
    path: pathPart.split('/').filter(Boolean),
  };
  if (queryPart) {
    url.query = queryPart.split('&').map((kv) => {
      const [k, v] = kv.split('=');
      return { key: k, value: v !== undefined ? v : '' };
    });
  }
  const item = {
    name: opts.name,
    request: {
      method,
      header: opts.headers ? headers.concat(opts.headers) : headers,
      url,
    },
  };
  if (opts.body) {
    item.request.body = { mode: 'raw', raw: typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body, null, 2) };
  }
  const events = [];
  if (opts.pre) events.push({ listen: 'pre-request', script: { exec: Array.isArray(opts.pre) ? opts.pre : opts.pre.split('\n'), type: 'text/javascript' } });
  if (opts.test) events.push({ listen: 'test', script: { exec: Array.isArray(opts.test) ? opts.test : opts.test.split('\n'), type: 'text/javascript' } });
  if (events.length) item.event = events;
  return item;
};

const J = (o) => JSON.stringify(o, null, 2);

function buildLog(hint) {}

module.exports = { req, J, sleep, buildLog };

(async () => {
  const root = path.join(__dirname, '..');

  const bigBody = () =>
    J({
      email: 'a'.repeat(30000),
      password: 'b'.repeat(30000),
    });

  const collection = {
    info: {
      _postman_id: crypto.randomUUID(),
      name: 'HustleHub+ API',
      description:
        'HustleHub+ Part 2 - secure freelance marketplace. Run order doubles as an end-to-end test suite:\n' +
        ' 1) Health, 2) Register, 3) Login (tokens captured), 4) Gigs CRUD + RBAC, 5) Bookings (+ simulated transactions),\n' +
        ' 6) Income aggregation, 7) Cleanup & delete, 8) Protected routes, 9) Security & hardening.\n\n' +
        'Prerequisites: backend running on https://localhost:3443 with the demo data seeded (npm run seed in backend/).\n' +
        'Execute: newman run "HustleHub+ Postman Collection.json" (installed via npm i -D newman; see backend/package.json test:newman).\n\n' +
        'NOTE: the final request intentionally triggers the login rate limiter (10 attempts / 15 min / IP) and will return 429.\n' +
        'Restart the backend to reset rate-limit counters before running the suite again.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [],
    variable: [
      { key: 'baseUrl', value: 'https://localhost:3443' },
      { key: 'clientEmail', value: 'alex@hustlehub.demo' },
      { key: 'freelancerEmail', value: 'zane@hustlehub.demo' },
      { key: 'demoPassword', value: 'DemoPass1!' },
      { key: 'clientToken', value: '' },
      { key: 'freelancerToken', value: '' },
      { key: 'gigId', value: '' },
      { key: 'bookingId', value: '' },
      { key: 'transactionRef', value: '' },
      { key: 'rand', value: '' },
      { key: 'lastRegisteredEmail', value: '' },
    ],
  };

  // ---------------------------------------------------------------- Health
  collection.item.push({
    name: 'Health',
    item: [
      req('GET', '/api/health', {
        name: 'Health Check',
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "const json = pm.response.json();",
          "pm.test('API reports success', () => pm.expect(json.status).to.eql('success'));",
        ],
      }),
    ],
  });

  // ---------------------------------------------------------------- Register
  collection.item.push({
    name: 'Auth - Register',
    item: [
      req('POST', '/api/auth/register', {
        name: 'Register - Freelancer (Success)',
        pre: ["pm.collectionVariables.set('rand', Date.now());"],
        body: {
          name: 'Postman Freelancer',
          email: 'postman{{rand}}@hustlehub.demo',
          password: 'PostmanPass1!',
          role: 'freelancer',
        },
        test: [
          "pm.test('Status code is 201', () => pm.response.to.have.status(201));",
          "const json = pm.response.json();",
          "pm.test('Freelancer token is generated', () => pm.expect(json.data.token).to.be.a('string'));",
          "pm.collectionVariables.set('lastRegisteredEmail', 'postman' + pm.collectionVariables.get('rand') + '@hustlehub.demo');",
        ],
      }),
      req('POST', '/api/auth/register', {
        name: 'Register - Client (Success)',
        pre: ["pm.collectionVariables.set('rand', Date.now() + 1);"],
        body: {
          name: 'Postman Client',
          email: 'postmanc{{rand}}@hustlehub.demo',
          password: 'PostmanPass1!',
          role: 'client',
        },
        test: [
          "pm.test('Status code is 201', () => pm.response.to.have.status(201));",
          "pm.test('Client token is generated', () => pm.expect(pm.response.json().data.token).to.be.a('string'));",
        ],
      }),
      req('POST', '/api/auth/register', {
        name: 'Register - Duplicate Email (Error)',
        body: {
          name: 'Postman Freelancer',
          email: '{{lastRegisteredEmail}}',
          password: 'PostmanPass1!',
          role: 'freelancer',
        },
        test: [
          "pm.test('Status code is 409', () => pm.response.to.have.status(409));",
          "const json = pm.response.json();",
          "pm.test('Duplicate email is rejected', () => pm.expect(json.status).to.eql('error'));",
        ],
      }),
      req('POST', '/api/auth/register', {
        name: 'Register - Validation Error (Bad Input)',
        body: { name: 'X', email: 'not-an-email', password: 'short', role: 'nope' },
        test: [
          "pm.test('Status code is 400', () => pm.response.to.have.status(400));",
          "pm.test('Validation message returned', () => pm.expect(pm.response.json().message).to.include('Password must be at least 8'));",
        ],
      }),
      req('POST', '/api/auth/register', {
        name: 'Register - Admin Role (Rejected)',
        body: {
          name: 'Admin Wannabe',
          email: 'admin@example.com',
          password: 'AdminPass1!',
          role: 'admin',
        },
        test: [
          "pm.test('Status code is 400', () => pm.response.to.have.status(400));",
          "const json = pm.response.json();",
          "pm.test('Admin role is rejected', () => pm.expect(json.message).to.include('Role must be one of'));",
        ],
      }),
    ],
  });

  // ---------------------------------------------------------------- Login
  collection.item.push({
    name: 'Auth - Login',
    item: [
      req('POST', '/api/auth/login', {
        name: 'Login - Client (Success)',
        body: { email: '{{clientEmail}}', password: '{{demoPassword}}' },
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "const json = pm.response.json();",
          "pm.test('Client token generated', () => pm.expect(json.data.token).to.be.a('string'));",
          "pm.collectionVariables.set('clientToken', json.data.token);",
        ],
      }),
      req('POST', '/api/auth/login', {
        name: 'Login - Freelancer (Success)',
        body: { email: '{{freelancerEmail}}', password: '{{demoPassword}}' },
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "const json = pm.response.json();",
          "pm.test('Freelancer token generated', () => pm.expect(json.data.token).to.be.a('string'));",
          "pm.collectionVariables.set('freelancerToken', json.data.token);",
        ],
      }),
      req('POST', '/api/auth/login', {
        name: 'Login - Wrong Password (Error)',
        body: { email: '{{clientEmail}}', password: 'WrongPass1!' },
        test: [
          "pm.test('Status code is 401', () => pm.response.to.have.status(401));",
          "pm.test('Rejects wrong password', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
      req('POST', '/api/auth/login', {
        name: 'Login - Non-Existent User (Error)',
        body: { email: 'ghost@hustlehub.demo', password: 'GhostPass1!' },
        test: [
          "pm.test('Status code is 401', () => pm.response.to.have.status(401));",
          "pm.test('No token issued', () => pm.expect((pm.response.json().data || {}).token).to.be.undefined);",
        ],
      }),
      req('POST', '/api/auth/login', {
        name: 'Login - Malformed JSON (Error)',
        body: '{ "email": "broken@example.com", "password": ',
        test: [
          "pm.test('Status code is 400', () => pm.response.to.have.status(400));",
          "pm.test('Controlled JSON parse error returned', () => pm.expect(pm.response.json().message).to.eql('Invalid JSON payload'));",
        ],
      }),
      req('POST', '/api/auth/login', {
        name: 'Login - Oversized Body (Error)',
        body: bigBody(),
        test: [
          "pm.test('Status code is 413', () => pm.response.to.have.status(413));",
          "pm.test('Body size limit enforced', () => pm.expect(pm.response.json().message).to.eql('Request body too large'));",
        ],
      }),
    ],
  });

  // ---------------------------------------------------------------- Gigs
  collection.item.push({
    name: 'Gigs - Marketplace CRUD & RBAC',
    item: [
      req('GET', '/api/gigs', {
        name: 'List Gigs (Public)',
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "const json = pm.response.json();",
          "pm.test('Returns a gig array', () => pm.expect(json.data.gigs).to.be.an('array'));",
          "if (Array.isArray(json.data.gigs) && json.data.gigs.length) {",
          "  pm.collectionVariables.set('gigId', json.data.gigs[0].id);",
          "}",
        ],
      }),
      req('GET', '/api/gigs?category=Design', {
        name: 'List Gigs - Category Filter',
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "const gigs = pm.response.json().data.gigs;",
          "pm.test('Only Design gigs returned', () => gigs.every(g => g.category === 'Design'));",
        ],
      }),
      req('GET', '/api/gigs/{{gigId}}', {
        name: 'Get Gig Detail (Public)',
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "pm.test('Gig has an id', () => pm.expect(pm.response.json().data.gig.id).to.exist);",
        ],
      }),
      req('POST', '/api/gigs', {
        name: 'Create Gig - Freelancer (Success)',
        token: 'freelancerToken',
        body: {
          title: 'Postman Retained Brand Kit',
          description: 'Created by the Postman collection: logo, palette and brand guidelines.',
          category: 'Design',
          price: 199,
          deliveryDays: 5,
        },
        test: [
          "pm.test('Status code is 201', () => pm.response.to.have.status(201));",
          "const json = pm.response.json();",
          "pm.test('Gig created', () => pm.expect(json.data.gig.id).to.be.a('string'));",
          "pm.collectionVariables.set('gigId', json.data.gig.id);",
        ],
      }),
      req('POST', '/api/gigs', {
        name: 'Create Gig - Client (Rejected)',
        token: 'clientToken',
        body: {
          title: 'Should Be Blocked',
          description: 'Clients must not create gigs.',
          category: 'Design',
          price: 100,
          deliveryDays: 1,
        },
        test: [
          "pm.test('Status code is 403', () => pm.response.to.have.status(403));",
          "pm.test('RBAC blocks clients', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
      req('POST', '/api/gigs', {
        name: 'Create Gig - No Token (Error)',
        body: {
          title: 'No Token',
          description: 'This gig should never exist.',
          category: 'Design',
          price: 100,
          deliveryDays: 1,
        },
        test: [
          "pm.test('Status code is 401', () => pm.response.to.have.status(401));",
          "pm.test('Auth required', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
      req('POST', '/api/gigs', {
        name: 'Create Gig - Validation Error (Bad Input)',
        token: 'freelancerToken',
        body: { category: 'Design', price: 5, deliveryDays: 3 },
        test: [
          "pm.test('Status code is 400', () => pm.response.to.have.status(400));",
          "pm.test('Validation message returned', () => pm.expect(pm.response.json().message).to.include('Title is required'));",
        ],
      }),
      req('POST', '/api/gigs', {
        name: 'Create Gig - XSS Stripped',
        token: 'freelancerToken',
        body: {
          title: '<script>alert(1)</script>Safe Service',
          description: '<img src=x onerror=alert(1)> A description that survives sanitisation cleanly.',
          category: 'Writing',
          price: 50,
          deliveryDays: 2,
        },
        test: [
          "pm.test('Status code is 201', () => pm.response.to.have.status(201));",
          "const gig = pm.response.json().data.gig;",
          "pm.test('Script tags removed from title', () => !gig.title.includes('<script>'));",
          "pm.test('Image tags removed from description', () => !gig.description.includes('<img'));",
        ],
      }),
      req('PUT', '/api/gigs/{{gigId}}', {
        name: 'Update Gig - Owner (Success)',
        token: 'freelancerToken',
        body: {
          title: 'Postman Retained Brand Kit (updated)',
          description: 'Updated description: logo, palette, brand guide and social kit.',
          category: 'Design',
          price: 249,
          deliveryDays: 6,
        },
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "pm.test('Price updated', () => pm.expect(pm.response.json().data.gig.price).to.eql(249));",
        ],
      }),
      req('PUT', '/api/gigs/{{gigId}}', {
        name: 'Update Gig - Non-Owner (Rejected)',
        token: 'clientToken',
        body: {
          title: 'Hijacked Title',
          description: 'Clients should not edit gigs they do not own.',
          category: 'Design',
          price: 1,
          deliveryDays: 1,
        },
        test: [
          "pm.test('Status code is 403', () => pm.response.to.have.status(403));",
          "pm.test('Ownership enforced', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
      req('GET', '/api/gigs/mine', {
        name: 'My Gigs - Freelancer (Success)',
        token: 'freelancerToken',
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "pm.test('Returns own gigs', () => pm.expect(pm.response.json().data.gigs).to.be.an('array'));",
        ],
      }),
      req('GET', '/api/gigs/mine', {
        name: 'My Gigs - Client (Rejected)',
        token: 'clientToken',
        test: [
          "pm.test('Status code is 403', () => pm.response.to.have.status(403));",
          "pm.test('RBAC blocks client', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
    ],
  });

  // ---------------------------------------------------------------- Bookings
  collection.item.push({
    name: 'Bookings - Simulated Payments',
    item: [
      req('POST', '/api/bookings', {
        name: 'Create Booking - Client (Success)',
        token: 'clientToken',
        body: { gigId: '{{gigId}}', note: 'Postman e2e booking - please deliver by Friday.' },
        test: [
          "pm.test('Status code is 201', () => pm.response.to.have.status(201));",
          "const json = pm.response.json();",
          "pm.test('Booking confirmed', () => pm.expect(json.data.booking.status).to.eql('confirmed'));",
          "pm.test('Transaction reference created', () => pm.expect(json.data.transaction.reference).to.be.a('string'));",
          "pm.collectionVariables.set('bookingId', json.data.booking.id);",
          "pm.collectionVariables.set('transactionRef', json.data.transaction.reference);",
        ],
      }),
      req('POST', '/api/bookings', {
        name: 'Create Booking - Freelancer (Rejected)',
        token: 'freelancerToken',
        body: { gigId: '{{gigId}}', note: 'Freelancers cannot book.' },
        test: [
          "pm.test('Status code is 403', () => pm.response.to.have.status(403));",
          "pm.test('RBAC blocks freelancer booking', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
      req('POST', '/api/bookings', {
        name: 'Create Booking - No Token (Error)',
        body: { gigId: '{{gigId}}', note: 'Not allowed.' },
        test: [
          "pm.test('Status code is 401', () => pm.response.to.have.status(401));",
          "pm.test('Auth required', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
      req('POST', '/api/bookings', {
        name: 'Create Booking - Missing Gig (Error)',
        token: 'clientToken',
        body: { gigId: '000000000000000000000000', note: 'No such gig.' },
        test: [
          "pm.test('Status code is 404', () => pm.response.to.have.status(404));",
          "pm.test('Missing gig rejected', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
      req('GET', '/api/bookings', {
        name: 'List My Bookings - Client (Success)',
        token: 'clientToken',
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "const bookings = pm.response.json().data.bookings;",
          "pm.test('Client bookings include the new one', () => bookings.some(b => b.id === pm.collectionVariables.get('bookingId')));",
        ],
      }),
      req('GET', '/api/bookings', {
        name: 'List Bookings on My Gigs - Freelancer (Success)',
        token: 'freelancerToken',
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "pm.test('Freelancer sees bookings on their gigs', () => pm.expect(pm.response.json().data.bookings).to.be.an('array').that.is.not.empty);",
        ],
      }),
      req('GET', '/api/bookings/{{bookingId}}', {
        name: 'Get Booking Detail',
        token: 'clientToken',
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "pm.test('Booking matches reference', () => pm.expect(pm.response.json().data.booking.id).to.eql(pm.collectionVariables.get('bookingId')));",
        ],
      }),
    ],
  });

  // ---------------------------------------------------------------- Income
  collection.item.push({
    name: 'Income - Freelancer Earnings',
    item: [
      req('GET', '/api/income', {
        name: 'Get Income - Freelancer (Success)',
        token: 'freelancerToken',
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "const income = pm.response.json().data.income;",
          "pm.test('Aggregated income returned', () => pm.expect(income.totalIncome).to.be.a('number'));",
          "pm.test('Includes postman transaction', () => income.transactions.some(t => t.reference === pm.collectionVariables.get('transactionRef')));",
        ],
      }),
      req('GET', '/api/income', {
        name: 'Get Income - Client (Rejected)',
        token: 'clientToken',
        test: [
          "pm.test('Status code is 403', () => pm.response.to.have.status(403));",
          "pm.test('RBAC blocks clients', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
      req('GET', '/api/income', {
        name: 'Get Income - No Token (Error)',
        test: [
          "pm.test('Status code is 401', () => pm.response.to.have.status(401));",
          "pm.test('Auth required', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
    ],
  });

  // ---------------------------------------------------------------- Cleanup / Delete
  collection.item.push({
    name: 'Cleanup - Gig Delete',
    item: [
      req('DELETE', '/api/gigs/{{gigId}}', {
        name: 'Delete Gig - Non-Owner (Rejected)',
        token: 'clientToken',
        test: [
          "pm.test('Status code is 403', () => pm.response.to.have.status(403));",
          "pm.test('Ownership enforced on delete', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
      req('DELETE', '/api/gigs/{{gigId}}', {
        name: 'Delete Gig - Owner (Success)',
        token: 'freelancerToken',
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "pm.test('Gig deleted', () => pm.expect(pm.response.json().data.id).to.eql(pm.collectionVariables.get('gigId')));",
        ],
      }),
      req('GET', '/api/gigs/{{gigId}}', {
        name: 'Deleted Gig No Longer Listed (Error)',
        test: [
          "pm.test('Status code is 404', () => pm.response.to.have.status(404));",
          "pm.test('Gone', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
    ],
  });

  // ---------------------------------------------------------------- Protected routes
  collection.item.push({
    name: 'Protected Routes - JWT',
    item: [
      req('GET', '/api/auth/profile', {
        name: 'Profile - Authenticated (Success)',
        token: 'clientToken',
        test: [
          "pm.test('Status code is 200', () => pm.response.to.have.status(200));",
          "pm.test('Returns user from token', () => pm.expect(pm.response.json().data.user.email).to.eql(pm.collectionVariables.get('clientEmail')));",
        ],
      }),
      req('GET', '/api/auth/profile', {
        name: 'Profile - No Token (Error)',
        test: [
          "pm.test('Status code is 401', () => pm.response.to.have.status(401));",
          "pm.test('Rejects missing token', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
      req('GET', '/api/auth/profile', {
        name: 'Profile - Invalid Token (Error)',
        headers: [{ key: 'Authorization', value: 'Bearer definitely-not-a-jwt' }],
        test: [
          "pm.test('Status code is 401', () => pm.response.to.have.status(401));",
          "pm.test('Rejects garbage token', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
    ],
  });

  // ---------------------------------------------------------------- Security & hardening
  collection.item.push({
    name: 'Security & Hardening',
    item: [
      req('GET', '/', {
        name: 'Security Headers - SPA (CSP / nosniff)',
        test: [
          "pm.test('CSP frame-ancestors denies embedding', () => pm.expect(pm.response.headers.get('content-security-policy')).to.include(\"frame-ancestors 'none'\"));",
          "pm.test('nosniff header set', () => pm.expect(pm.response.headers.get('x-content-type-options')).to.eql('nosniff'));",
          "pm.test('x-powered-by hidden', () => pm.expect(pm.response.headers.get('x-powered-by')).to.not.exist);",
        ],
      }),
      req('GET', '/api/does-not-exist', {
        name: '404 - Unknown API Route (Error)',
        test: [
          "pm.test('Status code is 404', () => pm.response.to.have.status(404));",
          "pm.test('Controlled 404 JSON', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
      req('POST', '/api/bookings', {
        name: 'NoSQL Injection - Booking (Neutralised)',
        token: 'clientToken',
        body: { gigId: { $gt: '' }, note: 'Inject me!', __proto__: { polluted: true } },
        test: [
          "pm.test('Status code is 400', () => pm.response.to.have.status(400));",
          "pm.test('Injection neutralised (validation error)', () => pm.expect(pm.response.json().message).to.include('A valid gig id is required'));",
        ],
      }),
      req('GET', '/api/gigs/000000000000000000000000', {
        name: 'NoSQL Injection - Gig Query (Neutralised)',
        test: [
          "pm.test('Status code is 404', () => pm.response.to.have.status(404));",
          "pm.test('Unknown id rejected', () => pm.expect(pm.response.json().status).to.eql('error'));",
        ],
      }),
      ...Array.from({ length: 8 }, (_, i) =>
        req('POST', '/api/auth/login', {
          name: `Login - Burn Auth Budget ${i + 1} (401)`,
          body: { email: 'alex@hustlehub.demo', password: 'WrongPass1!' },
          test: [
            "pm.test('Status code is 401 or 429', () => pm.expect([401, 429]).to.include(pm.response.code));",
            "const __m = pm.response.json().message || '';",
            "pm.test('Attempt handled', () => pm.expect(['Invalid email or password', 'Too many'].some((t) => __m.includes(t))).to.be.true);",
          ],
        })
      ),
      req('POST', '/api/auth/login', {
        name: 'Rate Limit - Login Throttled (429)',
        body: { email: 'alex@hustlehub.demo', password: 'WrongPass1!' },
        test: [
          "pm.test('Login requests are throttled with HTTP 429', () => pm.response.to.have.status(429));",
          "pm.test('Throttle message returned', () => pm.expect(pm.response.json().message).to.include('Too many'));",
        ],
      }),
    ],
  });

  const outPath = path.join(root, 'HustleHub+ Postman Collection.json');
  fs.writeFileSync(outPath, JSON.stringify(collection, null, 2));
  console.log('Regenerated Postman collection with', collection.item.length, 'folders.');
  const count = (it) => it.reduce((n, i) => n + (i.item ? count(i.item) : 1), 0);
  console.log('Total requests:', count(collection.item));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});