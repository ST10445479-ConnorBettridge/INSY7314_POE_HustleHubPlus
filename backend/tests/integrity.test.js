const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { connectTestDB, cleanDB, disconnectTestDB } = require('./db-test');
const { registerUser, createGig } = require('./helpers');
const Booking = require('../src/models/booking');
const Transaction = require('../src/models/transaction');
const User = require('../src/models/user');

beforeAll(async () => { await connectTestDB(); await cleanDB(); });
afterAll(disconnectTestDB);

test('removing a booked gig retains bookings, transactions and freelancer income', async () => {
  const owner = await registerUser({ email: 'history-owner@example.com', role: 'freelancer' });
  const client = await registerUser({ email: 'history-client@example.com', role: 'client' });
  const gig = await createGig(owner.token, { price: 250.75 });
  const booked = await request(app).post('/api/bookings').set('Authorization', `Bearer ${client.token}`).send({ gigId: gig.id });
  expect(booked.status).toBe(201);
  const removed = await request(app).delete(`/api/gigs/${gig.id}`).set('Authorization', `Bearer ${owner.token}`);
  expect(removed.status).toBe(200);
  expect((await request(app).get(`/api/gigs/${gig.id}`)).status).toBe(404);
  const mine = await request(app).get('/api/gigs/mine').set('Authorization', `Bearer ${owner.token}`);
  expect(mine.body.data.gigs).toHaveLength(0);
  expect(await Booking.countDocuments({ gig: gig.id })).toBe(1);
  expect(await Transaction.countDocuments({ gig: gig.id })).toBe(1);
  const detail = await request(app).get(`/api/bookings/${booked.body.data.booking.id}`).set('Authorization', `Bearer ${client.token}`);
  expect(detail.status).toBe(200);
  expect(detail.body.data.booking.gig.title).toBe(gig.title);
  const income = await request(app).get('/api/income').set('Authorization', `Bearer ${owner.token}`);
  expect(income.body.data.income.totalIncome).toBe(250.75);
  expect(income.body.data.income.taxEstimate).toBe(38.36);
  const unavailable = await request(app).post('/api/bookings').set('Authorization', `Bearer ${client.token}`).send({ gigId: gig.id });
  expect(unavailable.status).toBe(404);
});

test.each([['password', ['StrongPass1!']], ['password', { value: 'StrongPass1!' }], ['name', ['A Name']], ['email', ['a@example.com']]])('rejects non-text %s with a controlled 400', async (field, value) => {
  const res = await request(app).post('/api/auth/register').send({ name: 'Input Tester', email: 'types@example.com', password: 'StrongPass1!', role: 'client', [field]: value });
  expect(res.status).toBe(400);
  expect(res.body).not.toHaveProperty('stack');
});

test('rejects passwords over bcrypt’s 72-byte limit', async () => {
  const res = await request(app).post('/api/auth/register').send({ name: 'Password Tester', email: 'long@example.com', password: 'StrongPass1!' + 'x'.repeat(80), role: 'client' });
  expect(res.status).toBe(400);
  expect(res.body.message).toContain('72');
});

test('valid signed tokens cannot retain a role removed in the database', async () => {
  const owner = await registerUser({ email: 'demoted@example.com', role: 'freelancer' });
  await User.updateOne({ _id: owner.user.id }, { role: 'client' });
  const res = await request(app).get('/api/gigs/mine').set('Authorization', `Bearer ${owner.token}`);
  expect(res.status).toBe(403);
});

test('a deleted account’s otherwise valid token is rejected', async () => {
  const client = await registerUser({ email: 'removed@example.com', role: 'client' });
  await User.deleteOne({ _id: client.user.id });
  const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${client.token}`);
  expect(res.status).toBe(401);
});

test('rejects an expired JWT even when its signature is valid', async () => {
  const client = await registerUser({ email: 'expired@example.com', role: 'client' });
  const token = jwt.sign({ id: client.user.id }, process.env.JWT_SECRET, { expiresIn: -1, issuer: 'hustlehub-plus', audience: 'hustlehub-plus-api' });
  expect((await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`)).status).toBe(401);
});

test('rejects unexpected origins but accepts same-origin requests', async () => {
  const blocked = await request(app).get('/api/health').set('Origin', 'https://unapproved.example');
  expect(blocked.status).toBe(403);
  const same = await request(app).get('/api/health').set('Host', 'localhost:3443').set('Origin', 'http://localhost:3443');
  expect(same.status).toBe(200);
});

test('currency values cannot contain sub-cent amounts or arrays', async () => {
  const owner = await registerUser({ email: 'currency-owner@example.com', role: 'freelancer' });
  for (const price of [10.123, [100]]) {
    const res = await request(app).post('/api/gigs').set('Authorization', `Bearer ${owner.token}`).send({ title: 'Currency Test', description: 'A valid description for the currency regression.', category: 'Design', price });
    expect(res.status).toBe(400);
  }
});
