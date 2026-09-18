const { AppError } = require('./errorHandler');

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Access denied. Please authenticate first.', 401));
  }

  if (!roles.includes(req.user.role)) {
    return next(
      new AppError('Forbidden. You do not have permission to perform this action.', 403)
    );
  }

  next();
};

module.exports = { requireRole };