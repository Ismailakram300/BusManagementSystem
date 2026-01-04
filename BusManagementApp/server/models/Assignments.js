const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true
    }
  },
  { timestamps: true }
);

// Ensure one user can only be assigned to one bus
assignmentSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model('Assignment', assignmentSchema);

