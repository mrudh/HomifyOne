const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    plot: { type: mongoose.Schema.Types.ObjectId, ref: 'Plot', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'Buyer-Developer Meeting' },
    notes: { type: String },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30 },
    location: { type: String },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Meeting', meetingSchema);