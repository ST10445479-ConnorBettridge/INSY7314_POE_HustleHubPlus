const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 1,
      max: 1000000,
    },
    deliveryDays: {
      type: Number,
      required: [true, 'Delivery days are required'],
      min: 1,
      max: 365,
      default: 1,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

gigSchema.methods.toGig = function toGig(ownerName) {
  return {
    id: this._id.toString(),
    title: this.title,
    description: this.description,
    category: this.category,
    price: this.price,
    deliveryDays: this.deliveryDays,
    status: this.status,
    owner: this.owner ? this.owner.toString() : null,
    ownerName: ownerName || null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

gigSchema.statics.isValidId = function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
};

const Gig = mongoose.model('Gig', gigSchema);

module.exports = Gig;