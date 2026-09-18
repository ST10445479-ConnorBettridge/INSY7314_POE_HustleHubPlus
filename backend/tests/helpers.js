const request = require('supertest');
const app = require('../src/app');

const registerUser = async ({ name, email, password = 'StrongPass1!', role }) => {
  const res = await request(app).post('/api/auth/register').send({ name, email, password, role });
  if (res.status !== 201) {
    throw new Error(`registerUser(${email}) failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
};

const loginUser = async ({ email, password = 'StrongPass1!' }) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`loginUser(${email}) failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
};

const createGig = async (token, {
  title = 'Professional Logo Design',
  description = 'I design modern, professional logos for startups and small businesses with unlimited revisions.',
  category = 'Design',
  price = 150,
  deliveryDays = 3,
} = {}) => {
  const res = await request(app)
    .post('/api/gigs')
    .set('Authorization', `Bearer ${token}`)
    .send({ title, description, category, price, deliveryDays });
  if (res.status !== 201) {
    throw new Error(`createGig failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.gig;
};

module.exports = { registerUser, loginUser, createGig };