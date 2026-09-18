const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      enum: ['booking', 'refund'],
      default: 'booking',
    },
    status: {
      type: String,
      enum: ['completed', 'failed'],
      default: 'completed',
    },
  },
  { timestamps: true }
);

transactionSchema.methods.toTransaction = function toTransaction(extras = {}) {
  return {
    id: this._id.toString(),
    reference: this.reference,
    booking: extras.booking || (this.booking ? this.booking.toString() : null),
    gig: extras.gig || (this.gig ? this.gig.toString() : null),
    client: extras.client || (this.client ? this.client.toString() : null),
    freelancer: extras.freelancer || (this.freelancer ? this.freelancer.toString() : null),
    amount: this.amount,
    type: this.type,
    status: this.status,
    createdAt: this.createdAt,
  };
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;