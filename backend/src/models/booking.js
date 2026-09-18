const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
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
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

bookingSchema.methods.toBooking = function toBooking(extras = {}) {
  return {
    id: this._id.toString(),
    gig: extras.gig || (this.gig ? this.gig.toString() : null),
    client: extras.client || (this.client ? this.client.toString() : null),
    freelancer: extras.freelancer || (this.freelancer ? this.freelancer.toString() : null),
    note: this.note,
    amount: this.amount,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;