process.env.TEST_RATE_LIMITS = '1';
const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, cleanDB, disconnectTestDB } = require('./db-test');
const { registerUser, createGig } = require('./helpers');
beforeAll(async () => { await connectTestDB(); await cleanDB(); });
afterAll(disconnectTestDB);

test('authentication failures return 429 after ten failed attempts with retry guidance', async () => {
  for (let i = 0; i < 10; i++) {
    const res = await request(app).post('/api/auth/login').send({ email: 'unknown@example.com', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  }
  const res = await request(app).post('/api/auth/login').send({ email: 'unknown@example.com', password: 'WrongPass1!' });
  expect(res.status).toBe(429);
  expect(res.headers['retry-after']).toBeDefined();
  expect(res.body.message).toContain('Too many');
});

test('booking attempts are throttled after twenty requests', async () => {
  // No-token requests still count toward the sensitive-operation limit.
  for (let i = 0; i < 20; i++) {
    expect((await request(app).post('/api/bookings').send({ gigId: 'a'.repeat(24) })).status).toBe(401);
  }
  const res = await request(app).post('/api/bookings').send({ gigId: 'a'.repeat(24) });
  expect(res.status).toBe(429);
  expect(res.headers['retry-after']).toBeDefined();
});
