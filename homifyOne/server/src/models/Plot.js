const mongoose = require('mongoose');

const plotSchema = new mongoose.Schema({
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  plotNumber: { type: String, required: true },
  address: { type: String, required: true },
  development: { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  bedrooms: { type: Number },
  bathrooms: { type: Number },
  deadline: { type: Date },
  status: {
    type: String,
    enum: ['available', 'assigned', 'selections_pending', 'selections_submitted', 'selections_approved', 'completed'],
    default: 'available'
  }
}, { timestamps: true });

module.exports = mongoose.model('Plot', plotSchema);