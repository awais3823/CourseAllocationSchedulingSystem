const mongoose = require('mongoose');

const examStudentSchema = new mongoose.Schema(
  {
    registrationNo: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    semester: {
      type: Number
    },
    program: {
      type: String,
      trim: true
    },
    degreeLevel: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const examEntrySchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    courseName: {
      type: String,
      required: true,
      trim: true
    },
    semester: {
      type: Number
    },
    program: {
      type: String,
      trim: true
    },
    degreeLevel: {
      type: String,
      trim: true
    },
    teacherName: {
      type: String,
      trim: true
    },
    examDate: {
      type: Date,
      required: true
    },
    timeSlot: {
      type: String,
      enum: ['morning', 'evening'],
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    className: {
      type: String,
      trim: true
    },
    classroomCapacity: {
      type: Number
    },
    students: [examStudentSchema],
    totalStudents: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const conflictSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['student', 'teacher', 'classroom'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['warning', 'critical'],
      default: 'warning'
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { _id: false }
);

const examDatesheetSchema = new mongoose.Schema(
  {
    examId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    academicYear: {
      type: String,
      trim: true
    },
    generatedFrom: {
      type: String,
      enum: ['system', 'excel'],
      default: 'excel'
    },
    examPeriod: {
      startDate: {
        type: Date,
        required: true
      },
      endDate: {
        type: Date,
        required: true
      }
    },
    timeSlots: {
      morning: {
        startTime: { type: String, default: '09:15' },
        endTime: { type: String, default: '12:15' }
      },
      evening: {
        startTime: { type: String, default: '12:45' },
        endTime: { type: String, default: '15:45' }
      }
    },
    excludeWeekends: {
      type: Boolean,
      default: true
    },
    entries: [examEntrySchema],
    conflicts: [conflictSchema],
    excelMeta: {
      originalName: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      uploadedAt: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ExamDatesheet', examDatesheetSchema);


