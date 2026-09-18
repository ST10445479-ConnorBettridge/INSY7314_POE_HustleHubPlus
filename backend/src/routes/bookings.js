const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Gig = require('../models/gig');
const Booking = require('../models/booking');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { bookingValidation } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

const toBookingPayload = (doc) => ({
  id: doc._id.toString(),
  gig: doc.gig && { id: doc.gig._id.toString(), title: doc.gig.title },
  client: doc.client && { id: doc.client._id.toString(), name: doc.client.name, email: doc.client.email },
  freelancer: doc.freelancer && { id: doc.freelancer._id.toString(), name: doc.freelancer.name, email: doc.freelancer.email },
  note: doc.note,
  amount: doc.amount,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const findPopulatedBooking = (id) =>
  Booking.findById(id)
    .populate('gig', 'title price')
    .populate('client', 'name email')
    .populate('freelancer', 'name email');

// Create a booking (client only). Simulated payment: each booking creates an
// associated transaction record (income for the freelancer).
router.post('/', authenticate, requireRole('client'), bookingValidation, async (req, res, next) => {
  try {
    const { gigId, note } = req.body;

    const gig = await Gig.findOne({ _id: gigId, status: 'active' });
    if (!gig) {
      return next(new AppError('Gig not found or no longer available', 404));
    }
    if (gig.owner.toString() === req.user.id) {
      return next(new AppError('You cannot book your own gig', 400));
    }

    // Simulated payment confirmation - always succeeds for the demo.
    const booking = await Booking.create({
      gig: gig._id,
      client: req.user.id,
      freelancer: gig.owner,
      note: note || '',
      amount: gig.price,
      status: 'confirmed',
    });

    const reference = `TXN-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const transaction = await Transaction.create({
      reference,
      booking: booking._id,
      gig: gig._id,
      client: req.user.id,
      freelancer: gig.owner,
      amount: gig.price,
      type: 'booking',
      status: 'completed',
    });

    logger.info('Booking created with transaction', {
      bookingId: booking._id.toString(),
      txnId: transaction._id.toString(),
      client: req.user.id,
    });

    const full = await findPopulatedBooking(booking._id);

    res.status(201).json({
      status: 'success',
      message: 'Booking confirmed. Payment simulated successfully.',
      data: {
        booking: toBookingPayload(full),
        transaction: transaction.toTransaction(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// List bookings: clients see their own, freelancers see bookings on their gigs.
router.get('/', authenticate, async (req, res, next) => {
  try {
    const filter =
      req.user.role === 'client'
        ? { client: req.user.id }
        : req.user.role === 'freelancer'
        ? { freelancer: req.user.id }
        : {};

    const bookings = await Booking.find(filter)
      .populate('gig', 'title price')
      .populate('client', 'name email')
      .populate('freelancer', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      count: bookings.length,
      data: { bookings: bookings.map(toBookingPayload) },
    });
  } catch (err) {
    next(err);
  }
});

// View a single booking (client owner, gig freelancer, or admin).
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(new AppError('Invalid booking id', 400));
    }

    const booking = await Booking.findById(req.params.id)
      .populate('gig', 'title price')
      .populate('client', 'name email')
      .populate('freelancer', 'name email');

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    const isClient = booking.client._id.toString() === req.user.id;
    const isFreelancer = booking.freelancer._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isClient && !isFreelancer && !isAdmin) {
      logger.warn('Cross-user booking access blocked', { userId: req.user.id, booking: booking._id.toString() });
      return next(new AppError('You do not have permission to view this booking', 403));
    }

    res.status(200).json({ status: 'success', data: { booking: toBookingPayload(booking) } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;