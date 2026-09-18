const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, cleanDB, disconnectTestDB } = require('./db-test');
const { registerUser, createGig } = require('./helpers');
const Transaction = require('../src/models/transaction');
const Booking = require('../src/models/booking');

beforeAll(async () => {
  await connectTestDB();
  await cleanDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Booking API - POST /api/bookings (client creates)', () => {
  it('creates a booking AND a transaction record', async () => {
    const freelancer = await registerUser({ name: 'Freelancer Book', email: 'flancer-book@example.com', role: 'freelancer' });
    const gig = await createGig(freelancer.token, { title: 'Website Build', category: 'Web', price: 600 });

    const client = await registerUser({ name: 'Client Book', email: 'client-book@example.com', role: 'client' });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ gigId: gig.id, note: 'Please start next week.' });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/Booking confirmed/i);

    const { booking, transaction } = res.body.data;
    expect(booking.gig.id).toBe(gig.id);
    expect(booking.client.id).toBe(client.user.id);
    expect(booking.freelancer.id).toBe(freelancer.user.id);
    expect(booking.amount).toBe(600);
    expect(booking.status).toBe('confirmed');

    expect(transaction).toBeDefined();
    expect(transaction.amount).toBe(600);
    expect(transaction.reference).toMatch(/^TXN-/);
    expect(transaction.client).toBe(client.user.id);
    expect(transaction.freelancer).toBe(freelancer.user.id);
    expect(transaction.type).toBe('booking');
    expect(transaction.status).toBe('completed');
  });

  it('rejects a booking from a freelancer role (RBAC 403)', async () => {
    const freelancerA = await registerUser({ name: 'Freelancer A2', email: 'flancer-a2@example.com', role: 'freelancer' });
    const gig = await createGig(freelancerA.token);

    const freelancerB = await registerUser({ name: 'Freelancer B2', email: 'flancer-b2@example.com', role: 'freelancer' });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${freelancerB.token}`)
      .send({ gigId: gig.id });

    expect(res.status).toBe(403);
  });

  it('rejects a booking without a token (401)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ gigId: 'a'.repeat(24) });

    expect(res.status).toBe(401);
  });

  it('rejects a booking for a missing gig (404)', async () => {
    const client = await registerUser({ name: 'Client Missing', email: 'client-missing@example.com', role: 'client' });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ gigId: 'a'.repeat(24) });

    expect(res.status).toBe(404);
  });

  it('rejects a booking with an invalid gig id (400)', async () => {
    const client = await registerUser({ name: 'Client Invalid', email: 'client-invalid@example.com', role: 'client' });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ gigId: 'not-a-real-id' });

    expect(res.status).toBe(400);
  });
});

describe('Booking API - GET /api/bookings (role-scoped lists)', () => {
  it('lets a client list only their own bookings', async () => {
    const flancerA = await registerUser({ name: 'Freelancer ListA', email: 'flancer-lista@example.com', role: 'freelancer' });
    const gigA = await createGig(flancerA.token, { title: 'Gig For Client One', category: 'Web', price: 100 });

    const flancerB = await registerUser({ name: 'Freelancer ListB', email: 'flancer-listb@example.com', role: 'freelancer' });
    const gigB = await createGig(flancerB.token, { title: 'Gig For Client Two', category: 'Design', price: 200 });

    const clientOne = await registerUser({ name: 'Client One', email: 'client-one@example.com', role: 'client' });
    const clientTwo = await registerUser({ name: 'Client Two', email: 'client-two@example.com', role: 'client' });

    await request(app).post('/api/bookings').set('Authorization', `Bearer ${clientOne.token}`).send({ gigId: gigA.id });
    await request(app).post('/api/bookings').set('Authorization', `Bearer ${clientTwo.token}`).send({ gigId: gigB.id });

    const res = await request(app).get('/api/bookings').set('Authorization', `Bearer ${clientOne.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings.length).toBe(1);
    expect(res.body.data.bookings[0].gig.title).toBe('Gig For Client One');
  });

  it('lets a freelancer list bookings for their own gigs', async () => {
    const flancer = await registerUser({ name: 'Freelancer Incoming', email: 'flancer-incoming@example.com', role: 'freelancer' });
    const gig = await createGig(flancer.token, { title: 'Incoming Work', category: 'Writing', price: 300 });

    const client1 = await registerUser({ name: 'Client Incoming1', email: 'client-incoming1@example.com', role: 'client' });
    const client2 = await registerUser({ name: 'Client Incoming2', email: 'client-incoming2@example.com', role: 'client' });

    await request(app).post('/api/bookings').set('Authorization', `Bearer ${client1.token}`).send({ gigId: gig.id });
    await request(app).post('/api/bookings').set('Authorization', `Bearer ${client2.token}`).send({ gigId: gig.id });

    const res = await request(app).get('/api/bookings').set('Authorization', `Bearer ${flancer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings.length).toBe(2);
  });

it('blocks viewing another client\'s booking (403)', async () => {
    const flancer = await registerUser({ name: 'Freelancer Private', email: 'flancer-private@example.com', role: 'freelancer' });
    const gig = await createGig(flancer.token, { title: 'Private Job', category: 'Web', price: 400 });

    const clientA = await registerUser({ name: 'Client PrivateA', email: 'client-priva@example.com', role: 'client' });
    const clientB = await registerUser({ name: 'Client PrivateB', email: 'client-privb@example.com', role: 'client' });

    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${clientA.token}`)
      .send({ gigId: gig.id });
    const bookingId = createRes.body.data.booking.id;

    const viewRes = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${clientB.token}`);

    expect(viewRes.status).toBe(403);
});

it('rolls back the booking when transaction creation fails', async () => {
  const freelancer = await registerUser({
    name: 'Rollback Freelancer',
    email: 'rollback-flancer@example.com',
    role: 'freelancer',
  });
  const gig = await createGig(freelancer.token, {
    title: 'Rollback Gig',
    category: 'Web',
    price: 250,
  });
  const client = await registerUser({
    name: 'Rollback Client',
    email: 'rollback-client@example.com',
    role: 'client',
  });
  const originalCreate = Transaction.create;
  Transaction.create = jest.fn().mockRejectedValue(new Error('simulated transaction failure'));
  try {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ gigId: gig.id });
    expect(res.status).toBe(500);
    const remaining = await Booking.findOne({
      gig: gig.id,
      client: client.user.id,
    });
    expect(remaining).toBeNull();
  } finally {
    Transaction.create = originalCreate;
  }
});
});