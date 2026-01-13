const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  allocationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['allocated', 'deallocated'],
    default: 'allocated'
  }
}, {
  timestamps: true
});

// Compound index
allocationSchema.index({ teacherId: 1, courseId: 1 });

module.exports = mongoose.model('Allocation', allocationSchema);

