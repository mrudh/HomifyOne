const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['meeting', 'deadline', 'supplier_eta'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    allDay: { type: Boolean, default: false },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    plot: { type: mongoose.Schema.Types.ObjectId, ref: 'Plot' },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
    sourceType: { type: String, enum: ['meeting', 'plot_deadline', 'po_eta'], required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ['scheduled', 'updated', 'cancelled'], default: 'scheduled' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

calendarEventSchema.index({ sourceType: 1, sourceId: 1 });
calendarEventSchema.index({ participants: 1, startTime: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);