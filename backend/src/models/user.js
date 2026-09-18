const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

let dummyHashPromise = null;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false,
  },
  role: {
    type: String,
    enum: ['client', 'freelancer', 'admin'],
    default: 'client',
  },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    createdAt: this.createdAt,
  };
};

userSchema.statics.findByEmail = function findByEmail(email) {
  return this.findOne({ email }).select('+password');
};

userSchema.statics.getDummyHash = function getDummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = bcrypt.hash('hustlehub-dummy-compare-value', SALT_ROUNDS);
  }
  return dummyHashPromise;
};

userSchema.statics.authenticate = async function authenticate(email, password) {
  const user = await this.findOne({ email }).select('+password');

  if (!user) {
    // Constant-time-equivalent behaviour: run a dummy bcrypt compare so account
    // existence cannot be detected through response timing.
    await bcrypt.compare(password, await this.getDummyHash());
    return null;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return null;

  logger.info('User authenticated', { userId: user._id.toString(), role: user.role });
  return user.toSafeObject();
};

userSchema.statics.createUser = async function createUser({ name, email, password, role }) {
  try {
    const exists = await this.findOne({ email }).select('_id');
    if (exists) return null; // duplicate email

    const user = await this.create({ name, email, password, role });
    logger.info('User created', { userId: user._id.toString(), role: user.role });
    return user.toSafeObject();
  } catch (err) {
    if (err && err.code === 11000) {
      return null; // duplicate email (unique index backstop)
    }
    throw err;
  }
};

userSchema.statics.getAllUsers = async function getAllUsers() {
  const users = await this.find().select('-password');
  return users.map((u) => u.toSafeObject());
};

const User = mongoose.model('User', userSchema);

module.exports = User;