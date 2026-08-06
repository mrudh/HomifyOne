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
  
  aiSummary: {
    summary: { type: String, default: '' }, 
    invoiceNumber: { type: String, default: '' },
    vendorName: { type: String, default: '' },
    invoiceDate: { type: String, default: '' },
    dueDate: { type: String, default: '' },
    extractedAmount: { type: Number, default: null },
    lineItems: [{
      description: { type: String, default: '' },
      quantity: { type: Number, default: null },
      unitPrice: { type: Number, default: null },
      lineTotal: { type: Number, default: null },
    }],
    amountMismatch: { type: Boolean, default: false },
    raw: { type: String, default: '' }, 
    summarisedAt: { type: Date, default: null },
  },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);