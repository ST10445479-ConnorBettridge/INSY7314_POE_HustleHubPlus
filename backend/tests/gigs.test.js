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

describe('Gig API - POST /api/gigs (create)', () => {
  it('lets a freelancer create a gig', async () => {
    const { token } = await registerUser({ name: 'Freelancer A', email: 'flancer-a@example.com', role: 'freelancer' });
    const gig = await createGig(token);

    expect(gig).toHaveProperty('id');
    expect(gig.title).toBe('Professional Logo Design');
    expect(gig.price).toBe(150);
    expect(gig.status).toBe('active');
    expect(gig.owner).toBeTruthy();
  });

  it('rejects gig creation for a client (RBAC 403)', async () => {
    const { token } = await registerUser({ name: 'Client A', email: 'client-a@example.com', role: 'client' });

    const res = await request(app)
      .post('/api/gigs')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Nope', description: 'Clients cannot create gigs at all.', category: 'X', price: 10 });

    expect(res.status).toBe(403);
  });

  it('rejects gig creation without a token (401)', async () => {
    const res = await request(app)
      .post('/api/gigs')
      .send({ title: 'Nope', description: 'No token provided for this request.', category: 'X', price: 10 });

    expect(res.status).toBe(401);
  });

  it('rejects invalid gig input (400)', async () => {
    const { token } = await registerUser({ name: 'Freelancer Bad', email: 'flancer-bad@example.com', role: 'freelancer' });

    const res = await request(app)
      .post('/api/gigs')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '', description: 'short', category: 'X', price: 0 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Title|Description|Price/);
  });
});

describe('Gig API - GET /api/gigs (browse)', () => {
  it('returns all active gigs publicly', async () => {
    const { token } = await registerUser({ name: 'Freelancer Browse', email: 'flancer-browse@example.com', role: 'freelancer' });
    await createGig(token, { title: 'Web Development', category: 'Web', price: 500 });

    const res = await request(app).get('/api/gigs');

    expect(res.status).toBe(200);
    expect(res.body.data.gigs.length).toBeGreaterThan(0);
    const titles = res.body.data.gigs.map((g) => g.title);
    expect(titles).toContain('Web Development');
    expect(res.body.data.gigs[0]).toHaveProperty('ownerName');
  });

  it('shows an individual gig by id', async () => {
    const { token } = await registerUser({ name: 'Freelancer One', email: 'flancer-one@example.com', role: 'freelancer' });
    const gig = await createGig(token, { title: 'Content Writing', category: 'Writing', price: 80 });

    const res = await request(app).get(`/api/gigs/${gig.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.gig.title).toBe('Content Writing');
  });

  it('search query filters gigs by title/description (case-insensitive)', async () => {
    const { token } = await registerUser({ name: 'Freelancer Search', email: 'flancer-search@example.com', role: 'freelancer' });
    await createGig(token, { title: 'Brand Photography', category: 'Photography', price: 120 });
    await createGig(token, { title: 'Video Editing', category: 'Video', price: 220 });

    const res = await request(app).get('/api/gigs?query=photography');

    expect(res.status).toBe(200);
    const titles = res.body.data.gigs.map((g) => g.title);
    expect(titles).toContain('Brand Photography');
    expect(titles).not.toContain('Video Editing');
  });

  it('returns 404 for a missing gig', async () => {
    const res = await request(app).get(`/api/gigs/${'a'.repeat(24)}`);
    expect(res.status).toBe(404);
  });
});

describe('Gig API - GET /api/gigs/mine', () => {
  it('returns only the authenticated freelancer\'s gigs', async () => {
    const { token } = await registerUser({ name: 'Freelancer Mine', email: 'flancer-mine@example.com', role: 'freelancer' });
    await createGig(token, { title: 'Mine Only', category: 'Web', price: 100 });

    const second = await registerUser({ name: 'Freelancer Other', email: 'flancer-other@example.com', role: 'freelancer' });
    await createGig(second.token, { title: 'Not Mine', category: 'Web', price: 200 });

    const res = await request(app).get('/api/gigs/mine').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.gigs.length).toBe(1);
    expect(res.body.data.gigs[0].title).toBe('Mine Only');
  });

  it('forbids clients from requesting their own gigs (403)', async () => {
    const { token } = await registerUser({ name: 'Client Mine', email: 'client-mine@example.com', role: 'client' });

    const res = await request(app).get('/api/gigs/mine').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

describe('Gig API - PUT /api/gigs/:id (ownership enforced)', () => {
  it('lets the owner update their gig', async () => {
    const { token } = await registerUser({ name: 'Freelancer Edit', email: 'flancer-edit@example.com', role: 'freelancer' });
    const gig = await createGig(token);

    const res = await request(app)
      .put(`/api/gigs/${gig.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Logo Package', description: 'An updated description that is long enough to pass validation.', category: 'Design', price: 250, deliveryDays: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.gig.title).toBe('Updated Logo Package');
    expect(res.body.data.gig.price).toBe(250);
  });

  it('blocks updating another freelancer\'s gig (403)', async () => {
    const owner = await registerUser({ name: 'Freelancer Owner', email: 'flancer-owner@example.com', role: 'freelancer' });
    const gig = await createGig(owner.token);

    const other = await registerUser({ name: 'Freelancer Thief', email: 'flancer-thief@example.com', role: 'freelancer' });

    const res = await request(app)
      .put(`/api/gigs/${gig.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ title: 'Hijacked', description: 'Description that is long enough to pass the validation rules here.', category: 'Web', price: 999, deliveryDays: 1 });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/own gigs/i);
  });
});

describe('Gig API - DELETE /api/gigs/:id (ownership enforced)', () => {
  it('lets the owner delete their gig', async () => {
    const { token } = await registerUser({ name: 'Freelancer Delete', email: 'flancer-delete@example.com', role: 'freelancer' });
    const gig = await createGig(token);

    const res = await request(app).delete(`/api/gigs/${gig.id}`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const check = await request(app).get(`/api/gigs/${gig.id}`);
    expect(check.status).toBe(404);
  });

  it('blocks deleting another freelancer\'s gig (403)', async () => {
    const owner = await registerUser({ name: 'Freelancer DelOwner', email: 'flancer-delowner@example.com', role: 'freelancer' });
    const gig = await createGig(owner.token);

    const other = await registerUser({ name: 'Freelancer DelThief', email: 'flancer-delthief@example.com', role: 'freelancer' });

    const res = await request(app).delete(`/api/gigs/${gig.id}`).set('Authorization', `Bearer ${other.token}`);

    expect(res.status).toBe(403);
  });
});