const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

const users = [];

const SALT_ROUNDS = 12;

class User {
  constructor({ name, email, password, role }) {
    this.id = users.length + 1;
    this.name = name;
    this.email = email;
    this.password = password;
    this.role = role;
    this.createdAt = new Date().toISOString();
  }

  toSafeObject() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
    };
  }
}

const createUser = async ({ name, email, password, role }) => {
  const existing = users.find((u) => u.email === email);
  if (existing) {
    return null;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = new User({ name, email, password: hashedPassword, role });
  users.push(user);

  logger.info('User registered', { userId: user.id, role: user.role });
  return user.toSafeObject();
};

let dummyHashPromise = null;
const getDummyHash = () => {
  if (!dummyHashPromise) {
    dummyHashPromise = bcrypt.hash('hustlehub-dummy-compare-value', SALT_ROUNDS);
  }
  return dummyHashPromise;
};

const authenticateUser = async (email, password) => {
  const user = users.find((u) => u.email === email);
  if (!user) {
    await bcrypt.compare(password, await getDummyHash());
    return null;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return null;
  }

  return user.toSafeObject();
};

const findUserByEmail = (email) => {
  return users.find((u) => u.email === email) || null;
};

const getAllUsers = () => {
  return users.map((u) => u.toSafeObject());
};

module.exports = { createUser, authenticateUser, findUserByEmail, getAllUsers };
