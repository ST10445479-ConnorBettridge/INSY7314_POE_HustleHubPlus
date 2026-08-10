const request = require('supertest');
const app = require('../src/app');

describe('Auth API - POST /api/auth/register', () => {
  it('should register a new freelancer successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'TestPass1!', role: 'freelancer' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.role).toBe('freelancer');
    expect(res.body.data.user).not.toHaveProperty('password');
    expect(res.body.data.token).toBeDefined();
  });

  it('should register a new client successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test Client', email: 'client@example.com', password: 'ClientPass1!', role: 'client' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('client');
  });

  it('should reject duplicate email registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Duplicate', email: 'test@example.com', password: 'TestPass1!', role: 'freelancer' });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already exists');
  });

  it('should reject registration with weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak', email: 'weak@example.com', password: 'weak', role: 'freelancer' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Password');
  });

  it('should reject registration with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad Email', email: 'notanemail', password: 'ValidPass1!', role: 'freelancer' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('email');
  });

  it('should reject registration with invalid role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad Role', email: 'role@example.com', password: 'ValidPass1!', role: 'superadmin' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Role');
  });

  it('should reject registration with empty name', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'noname@example.com', password: 'ValidPass1!', role: 'freelancer' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Name');
  });
});

describe('Auth API - POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Login User', email: 'login@example.com', password: 'LoginPass1!', role: 'freelancer' });
  });

  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'LoginPass1!' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('login@example.com');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'WrongPass1!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid');
  });

  it('should reject login with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'SomePass1!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid');
  });

  it('should reject login with missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Password');
  });
});

describe('Auth API - GET /api/auth/profile', () => {
  it('should reject profile access without token', async () => {
    const res = await request(app).get('/api/auth/profile');

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('No token');
  });

  it('should reject profile access with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalidtoken123');

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid token');
  });

  it('should return profile with valid token', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Profile User', email: 'profile@example.com', password: 'Profile1!', role: 'freelancer' });

    const token = registerRes.body.data.token;

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('profile@example.com');
  });
});

describe('API - GET /api/health', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('HustleHub+ API is running');
  });
});

describe('API - 404 handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');

    expect(res.status).toBe(404);
  });
});
