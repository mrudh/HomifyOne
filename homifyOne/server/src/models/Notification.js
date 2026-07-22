const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'order_submitted', 'order_approved', 'order_rejected',
      'purchase_order_created', 'purchase_order_status_changed', 'invoice_submitted',
      'invoice_status_changed',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', notificationSchema);