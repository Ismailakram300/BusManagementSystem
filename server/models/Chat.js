const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

// Index for efficient querying by bus and timestamp
chatSchema.index({ bus: 1, createdAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);

