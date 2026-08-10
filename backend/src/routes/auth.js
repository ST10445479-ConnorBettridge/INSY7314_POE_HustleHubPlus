const express = require('express');
const jwt = require('jsonwebtoken');
const { registerValidation, loginValidation } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { createUser, authenticateUser } = require('../models/user');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      issuer: 'hustlehub-plus',
      audience: 'hustlehub-plus-api',
    }
  );
};

router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const user = await createUser({ name, email, password, role });
    if (!user) {
      return next(new AppError('A user with this email already exists', 409));
    }

    const token = generateToken(user);

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: { user, token },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await authenticateUser(email, password);
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    const token = generateToken(user);

    logger.info('User logged in', { userId: user.id, email: user.email });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: { user, token },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/profile', authenticate, (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { user: req.user },
  });
});

module.exports = router;
