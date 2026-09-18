const express = require('express');
const Gig = require('../models/gig');
const Booking = require('../models/booking');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { gigValidation, gigIdParamValidation } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

const loadOwnerNames = async (gigs) => {
  const ownerIds = [...new Set(gigs.map((g) => g.owner.toString()))];
  const owners = await User.find({ _id: { $in: ownerIds } }).select('name');
  const map = new Map(owners.map((o) => [o._id.toString(), o.name]));
  return gigs.map((g) => g.toGig(map.get(g.owner.toString()) || null));
};

// Browse all active gigs (public).
router.get('/', async (req, res, next) => {
  try {
    const filter = { status: 'active' };
    if (req.query.category && typeof req.query.category === 'string') {
      filter.category = req.query.category;
    }
    if (req.query.query && typeof req.query.query === 'string') {
      const q = req.query.query.trim();
      if (q) {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
          { title: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
        ];
      }
    }

    const gigs = await Gig.find(filter).sort({ createdAt: -1 });
    const payload = await loadOwnerNames(gigs);
    res.status(200).json({ status: 'success', count: payload.length, data: { gigs: payload } });
  } catch (err) {
    next(err);
  }
});

// An authenticated freelancer's own gigs (alias for ?mine=true).
router.get('/mine', authenticate, requireRole('freelancer'), async (req, res, next) => {
  try {
    const gigs = await Gig.find({ owner: req.user.id }).sort({ createdAt: -1 });
    const payload = await loadOwnerNames(gigs);
    res.status(200).json({ status: 'success', count: payload.length, data: { gigs: payload } });
  } catch (err) {
    next(err);
  }
});

// Create a gig (freelancer only).
router.post('/', authenticate, requireRole('freelancer'), gigValidation, async (req, res, next) => {
  try {
    const { title, description, category, price, deliveryDays } = req.body;

    const gig = await Gig.create({
      title,
      description,
      category,
      price,
      deliveryDays: deliveryDays || 1,
      owner: req.user.id,
    });

    logger.info('Gig created', { gigId: gig._id.toString(), owner: req.user.id });

    res.status(201).json({
      status: 'success',
      message: 'Gig created successfully',
      data: { gig: gig.toGig() },
    });
  } catch (err) {
    next(err);
  }
});

// View a single gig (public).
router.get('/:id', gigIdParamValidation, async (req, res, next) => {
  try {
    const gig = await Gig.findOne({ _id: req.params.id, status: 'active' });
    if (!gig) {
      return next(new AppError('Gig not found', 404));
    }
    const [ownerName] = await loadOwnerNames([gig]);
    res.status(200).json({ status: 'success', data: { gig: ownerName } });
  } catch (err) {
    next(err);
  }
});

// Update a gig (freelancer owner only).
router.put(
  '/:id',
  authenticate,
  requireRole('freelancer'),
  gigIdParamValidation,
  gigValidation,
  async (req, res, next) => {
    try {
      const gig = await Gig.findById(req.params.id);
      if (!gig) {
        return next(new AppError('Gig not found', 404));
      }
      if (gig.owner.toString() !== req.user.id) {
        logger.warn('Cross-owner gig update attempt blocked', { userId: req.user.id, gig: gig._id.toString() });
        return next(new AppError('You can only modify your own gigs', 403));
      }

      const { title, description, category, price, deliveryDays } = req.body;
      gig.title = title;
      gig.description = description;
      gig.category = category;
      gig.price = price;
      gig.deliveryDays = deliveryDays || gig.deliveryDays;
      await gig.save();

      logger.info('Gig updated', { gigId: gig._id.toString() });

      res.status(200).json({
        status: 'success',
        message: 'Gig updated successfully',
        data: { gig: gig.toGig() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Delete a gig (freelancer owner only). Cascades to its bookings and transactions.
router.delete('/:id', authenticate, requireRole('freelancer'), gigIdParamValidation, async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return next(new AppError('Gig not found', 404));
    }
    if (gig.owner.toString() !== req.user.id) {
      logger.warn('Cross-owner gig delete attempt blocked', { userId: req.user.id, gig: gig._id.toString() });
      return next(new AppError('You can only delete your own gigs', 403));
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Booking.deleteMany({ gig: gig._id }).session(session);
        await Transaction.deleteMany({ gig: gig._id }).session(session);
        await gig.deleteOne({ _id: gig._id }).session(session);
      });
    } finally {
      await session.endSession();
    }

    logger.info('Gig deleted', { gigId: req.params.id });

    res.status(200).json({
      status: 'success',
      message: 'Gig deleted successfully',
      data: { id: req.params.id },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;