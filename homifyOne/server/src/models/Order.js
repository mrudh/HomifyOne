const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String },
    subCategory: { type: String },
    room: { type: String },
    price: { type: Number, default: 0 },
    imageUrl: { type: String, default: "" },
    type: { type: String, enum: ["standard", "extra"], required: true },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    plot: { type: mongoose.Schema.Types.ObjectId, ref: "Plot", required: true },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    pricing: {
      subtotal: { type: Number, default: 0 },
      credit: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      finalTotal: { type: Number, default: 0 },
      allowance: { type: Number, default: 0 },
      promoCode: { type: String, default: null },
    },
    status: {
      type: String,
      enum: ["submitted", "approved", "rejected"],
      default: "submitted",
    },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Order', orderSchema);