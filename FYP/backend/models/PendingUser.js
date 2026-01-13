const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
  registrationNo: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique email + registrationNo combination
pendingUserSchema.index({ email: 1, registrationNo: 1 }, { unique: true });

module.exports = mongoose.model('PendingUser', pendingUserSchema);




