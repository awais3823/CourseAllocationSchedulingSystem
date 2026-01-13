const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  position: {
    type: Number,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  notified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate waitlist entries
waitlistSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

// Index for efficient position queries
waitlistSchema.index({ courseId: 1, position: 1 });

module.exports = mongoose.model('Waitlist', waitlistSchema);




