const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  plot: { type: mongoose.Schema.Types.ObjectId, ref: 'Plot', required: true },
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    room: String,
    category: String,
    quantity: { type: Number, default: 1 },
  }],
  totalCost: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'sent', 'fulfilled'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);