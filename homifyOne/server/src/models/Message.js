const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      default: '',
      trim: true,
    },
    attachment: {
      fileKey: { type: String, default: null },
      fileName: { type: String, default: null },
      fileType: { type: String, default: null },
      fileSize: { type: Number, default: null },
    },
    readAt: {
      type: Date,
      default: null
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Message', messageSchema);
