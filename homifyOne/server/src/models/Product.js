const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  subCategory: { type: String, default: '' },
  room: { type: String },
  style: { type: String, default: '', trim: true },
  type: {
    type: String,
    enum: ['choice', 'extra'],
    required: true
  },
  price: { type: Number, default: 0 },
  imageUrl: { type: String },
  tags: [{ type: String }],
  isActive: { type: Boolean, default: true },
  // Key/value spec sheet, e.g. { label: 'Material', value: 'Solid oak' }.
  // Optional and additive — only populated for 'choice' products via the
  // generateChoiceSpecifications.js enrichment script; existing products
  // and behaviour are unaffected until this is set.
  specifications: [{
    label: { type: String, trim: true },
    value: { type: String, trim: true }
  }]
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);