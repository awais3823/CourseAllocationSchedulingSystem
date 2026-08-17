const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
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
  attempt: {
    type: Number,
    default: 1,
    min: 1,
    index: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['registered', 'completed', 'dropped'],
    default: 'registered'
  },
  marks: {
    type: Number,
    default: null,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    default: null
  },
  gradePoint: {
    type: Number,
    default: null,
    min: 0,
    max: 4
  },
  evaluatedAt: {
    type: Date,
    default: null
  },
  attendanceSessions: [
    {
      sessionDate: {
        type: Date,
        required: true
      },
      status: {
        type: String,
        enum: ['present', 'absent'],
        required: true
      },
      markedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  attendanceSummary: {
    totalSessions: {
      type: Number,
      default: 0
    },
    presentCount: {
      type: Number,
      default: 0
    },
    absentCount: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    }
  },
  attendanceLocked: {
    type: Boolean,
    default: false
  },
  attendanceFinalizedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate registrations per attempt
registrationSchema.index({ studentId: 1, courseId: 1, attempt: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);

