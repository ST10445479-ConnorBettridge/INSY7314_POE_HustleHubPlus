const { body, param, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return next(new AppError(messages.join('. '), 400));
  }
  next();
};

const registerValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('role')
    .trim()
    .isIn(['client', 'freelancer'])
    .withMessage('Role must be one of: client, freelancer'),
  handleValidationErrors,
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const gigValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('price')
    .isFloat({ min: 1, max: 1000000 })
    .withMessage('Price must be between 1 and 1000000'),
  body('deliveryDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Delivery days must be a whole number between 1 and 365'),
  handleValidationErrors,
];

const gigIdParamValidation = [
  param('id').isMongoId().withMessage('Invalid gig id'),
  handleValidationErrors,
];

const bookingValidation = [
  body('gigId').isMongoId().withMessage('A valid gig id is required'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note must not exceed 500 characters'),
  handleValidationErrors,
];

module.exports = {
  registerValidation,
  loginValidation,
  gigValidation,
  gigIdParamValidation,
  bookingValidation,
};