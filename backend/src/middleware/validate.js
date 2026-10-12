const { body, param, query, validationResult } = require('express-validator');
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
    .isString().withMessage('Email must be text').bail()
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .isString().withMessage('Password must be text').bail()
    .custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Password must not exceed 72 UTF-8 bytes')
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
    .isString().withMessage('Name must be text').bail()
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('role')
    .isString().withMessage('Role must be text').bail()
    .trim()
    .isIn(['client', 'freelancer'])
    .withMessage('Role must be one of: client, freelancer'),
  handleValidationErrors,
];

const loginValidation = [
  body('email')
    .isString().withMessage('Email must be text').bail()
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password').isString().withMessage('Password must be text').bail()
    .notEmpty().withMessage('Password is required')
    .custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Password must not exceed 72 UTF-8 bytes'),
  handleValidationErrors,
];

const gigValidation = [
  body('title')
    .isString().withMessage('Title must be text').bail()
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .isString().withMessage('Description must be text').bail()
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .isString().withMessage('Category must be text').bail()
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('price')
    .custom(value => (typeof value === 'number' || typeof value === 'string') && /^\d+(\.\d{1,2})?$/.test(String(value)))
    .withMessage('Price must have at most two decimal places').bail()
    .isFloat({ min: 1, max: 1000000 })
    .withMessage('Price must be between 1 and 1000000').toFloat(),
  body('deliveryDays')
    .optional()
    .custom(value => typeof value === 'number' || typeof value === 'string').withMessage('Delivery days must be a number').bail()
    .isInt({ min: 1, max: 365 })
    .withMessage('Delivery days must be a whole number between 1 and 365').toInt(),
  handleValidationErrors,
];

const gigIdParamValidation = [
  param('id').isMongoId().withMessage('Invalid gig id'),
  handleValidationErrors,
];

const bookingValidation = [
  body('gigId').isString().withMessage('A valid gig id is required').bail().isMongoId().withMessage('A valid gig id is required'),
  body('note').optional().isString().withMessage('Note must be text').bail().trim().isLength({ max: 500 }).withMessage('Note must not exceed 500 characters'),
  handleValidationErrors,
];

const browseValidation = [
  query('category').optional().isString().withMessage('Category must be text').bail().trim().isLength({ max: 50 }).withMessage('Category must not exceed 50 characters'),
  query('query').optional().isString().withMessage('Search must be text').bail().trim().isLength({ max: 100 }).withMessage('Search must not exceed 100 characters'),
  handleValidationErrors,
];

module.exports = {
  registerValidation,
  loginValidation,
  gigValidation,
  gigIdParamValidation,
  bookingValidation,
  browseValidation,
};
