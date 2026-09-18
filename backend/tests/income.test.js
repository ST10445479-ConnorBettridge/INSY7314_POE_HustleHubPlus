const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, cleanDB, disconnectTestDB } = require('./db-test');
const { registerUser, createGig } = require('./helpers');

beforeAll(async () => {
  await connectTestDB();
  await cleanDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Income API - GET /api/income (freelancer)', () => {
  it('tracks income earned from bookings made by clients', async () => {
    const freelancer = await registerUser({ name: 'Ricardo Freelancer', email: 'ricardo@example.com', role: 'freelancer' });
    const gigA = await createGig(freelancer.token, { title: 'Web App', category: 'Web', price: 500 });
    const gigB = await createGig(freelancer.token, { title: 'Mobile App', category: 'Web', price: 1200 });

    const client1 = await registerUser({ name: 'Client One', email: 'payone@example.com', role: 'client' });
    const client2 = await registerUser({ name: 'Client Two', email: 'paytwo@example.com', role: 'client' });

    await request(app).post('/api/bookings').set('Authorization', `Bearer ${client1.token}`).send({ gigId: gigA.id });
    await request(app).post('/api/bookings').set('Authorization', `Bearer ${client2.token}`).send({ gigId: gigB.id });
    await request(app).post('/api/bookings').set('Authorization', `Bearer ${client2.token}`).send({ gigId: gigA.id, note: 'Second order' });

    const res = await request(app).get('/api/income').set('Authorization', `Bearer ${freelancer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.income.totalIncome).toBe(500 + 1200 + 500);
    expect(res.body.data.income.transactionCount).toBe(3);
    expect(res.body.data.income.transactions.length).toBe(3);
    expect(res.body.data.income.transactions[0]).toHaveProperty('reference');
    expect(res.body.data.income.transactions[0]).toHaveProperty('client');
    // Estimated tax: SECA-style 15.3% of gross earnings.
    expect(res.body.data.income.taxRate).toBe(0.153);
    expect(res.body.data.income.taxEstimate).toBeCloseTo((500 + 1200 + 500) * 0.153, 2);
    expect(res.body.data.income.netIncome).toBeCloseTo((500 + 1200 + 500) * (1 - 0.153), 2);
  });

  it('only counts income for the correct freelancer', async () => {
    const flancerA = await registerUser({ name: 'Freelancer Alpha', email: 'alpha@example.com', role: 'freelancer' });
    const gigA = await createGig(flancerA.token, { title: 'Alpha Gig', category: 'Web', price: 999 });

    const flancerB = await registerUser({ name: 'Freelancer Beta', email: 'beta@example.com', role: 'freelancer' });
    const gigB = await createGig(flancerB.token, { title: 'Beta Gig', category: 'Web', price: 777 });

    const client = await registerUser({ name: 'Client AlphaBeta', email: 'client-ab@example.com', role: 'client' });

    await request(app).post('/api/bookings').set('Authorization', `Bearer ${client.token}`).send({ gigId: gigA.id });
    await request(app).post('/api/bookings').set('Authorization', `Bearer ${client.token}`).send({ gigId: gigB.id });

    const resA = await request(app).get('/api/income').set('Authorization', `Bearer ${flancerA.token}`);
    const resB = await request(app).get('/api/income').set('Authorization', `Bearer ${flancerB.token}`);

    expect(resA.body.data.income.totalIncome).toBe(999);
    expect(resB.body.data.income.totalIncome).toBe(777);
  });

  it('forbids clients from viewing income (403)', async () => {
    const client = await registerUser({ name: 'Client NotIncome', email: 'client-notincome@example.com', role: 'client' });

    const res = await request(app).get('/api/income').set('Authorization', `Bearer ${client.token}`);

    expect(res.status).toBe(403);
  });

  it('requires authentication (401)', async () => {
    const res = await request(app).get('/api/income');
    expect(res.status).toBe(401);
  });
});