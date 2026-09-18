const express = require('express');
const Transaction = require('../models/transaction');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

// Freelancer income summary and transaction history.
router.get('/', authenticate, requireRole('freelancer'), async (req, res, next) => {
  try {
    const freelancerId = req.user.id;

    const transactions = await Transaction.find({ freelancer: freelancerId })
      .populate('gig', 'title')
      .populate('client', 'name email')
      .populate('booking', 'createdAt')
      .sort({ createdAt: -1 });

    const totalIncome = transactions
      .filter((t) => t.status === 'completed' && t.type === 'booking')
      .reduce((sum, t) => sum + t.amount, 0);

    // SECA-style self-employment estimate (see README): 15.3%.
    const TAX_RATE = 0.153;
    const taxEstimate = Math.round(totalIncome * TAX_RATE * 100) / 100;
    const netIncome = Math.round((totalIncome - taxEstimate) * 100) / 100;

    const payload = transactions.map((t) => ({
      id: t._id.toString(),
      reference: t.reference,
      booking: t.booking ? t.booking._id.toString() : null,
      gig: t.gig ? { id: t.gig._id.toString(), title: t.gig.title } : null,
      client: t.client ? { id: t.client._id.toString(), name: t.client.name, email: t.client.email } : null,
      amount: t.amount,
      type: t.type,
      status: t.status,
      createdAt: t.createdAt,
    }));

    res.status(200).json({
      status: 'success',
      data: {
        income: {
          totalIncome,
          taxRate: TAX_RATE,
          taxEstimate,
          netIncome,
          transactionCount: transactions.length,
          transactions: payload,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;