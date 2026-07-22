const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileKey: { type: String, required: true },
  fileName: { type: String, required: true },
  amount: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['submitted', 'pending', 'paid', 'flagged'],
    default: 'submitted',
  },
  flagReason: { 
    type: String,
    default: '' 
  },
  reviewedAt: { 
    type: Date,
    default: null
  },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);