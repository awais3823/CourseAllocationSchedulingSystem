const Course = require('../models/Course');
const Allocation = require('../models/Allocation');
const Registration = require('../models/Registration');
const Waitlist = require('../models/Waitlist');
const Timetable = require('../models/Timetable');

const normalizeProgram = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/\s+/g, ' ');
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private
exports.getCourses = async (req, res) => {
  try {
    const { semester, program, search } = req.query;
    const query = {};

    if (semester) {
      query.semester = parseInt(semester);
    }

    if (program) {
      // Case-insensitive exact match for dynamic program names
      const normalized = normalizeProgram(program);
      query.program = { $regex: `^${escapeRegex(normalized)}$`, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { courseName: { $regex: search, $options: 'i' } },
        { courseCode: { $regex: search, $options: 'i' } },
        { courseId: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(query).sort({ courseCode: 1 });

    // Get teacher information for each course from allocations
    const coursesWithTeachers = await Promise.all(
      courses.map(async (course) => {
        const allocation = await Allocation.findOne({
          courseId: course._id,
          status: 'allocated'
        }).populate('teacherId', 'name email');

        const courseObj = course.toObject();
        if (allocation && allocation.teacherId) {
          courseObj.teacherId = {
            _id: allocation.teacherId._id,
            name: allocation.teacherId.name,
            email: allocation.teacherId.email
          };
        } else {
          courseObj.teacherId = null;
        }
        return courseObj;
      })
    );

    res.json({
      success: true,
      count: coursesWithTeachers.length,
      courses: coursesWithTeachers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get distinct program names
// @route   GET /api/courses/programs
// @access  Private
exports.getPrograms = async (req, res) => {
  try {
    const programs = await Course.distinct('program');
    const cleaned = programs
      .map((p) => (typeof p === 'string' ? normalizeProgram(p) : ''))
      .filter((p) => p && p.length > 0);

    // Dedupe case-insensitively while preserving first-seen casing
    const seen = new Set();
    const unique = [];
    for (const p of cleaned) {
      const key = p.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(p);
    }
    unique.sort((a, b) => a.localeCompare(b));

    res.json({
      success: true,
      count: unique.length,
      programs: unique
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create course
// @route   POST /api/courses
// @access  Private/Admin
exports.createCourse = async (req, res) => {
  try {
    // Normalize program string
    if (req.body && typeof req.body.program === 'string') {
      req.body.program = normalizeProgram(req.body.program);
    }
    // If courseId not provided by client, derive it from courseCode
    if (!req.body.courseId) {
      const rawCode = (req.body.courseCode || '').toString().trim().toUpperCase();
      if (!rawCode) {
        return res.status(400).json({
          success: false,
          message: 'courseCode is required to generate a courseId'
        });
      }
      req.body.courseId = rawCode;
    }

    const course = await Course.create(req.body);

    res.status(201).json({
      success: true,
      course
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Course ID already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
exports.updateCourse = async (req, res) => {
  try {
    if (req.body && typeof req.body.program === 'string') {
      req.body.program = normalizeProgram(req.body.program);
    }
    // Ensure numeric fields are stored exactly as integers (avoid accidental string casts)
    const coerceIntField = (field) => {
      if (!req.body || !(field in req.body)) return;
      const raw = req.body[field];
      if (raw === null || raw === undefined || raw === '') return;
      const n = typeof raw === 'number' ? raw : Number.parseInt(raw, 10);
      if (!Number.isFinite(n)) {
        const err = new Error(`${field} must be a valid number`);
        err.statusCode = 400;
        throw err;
      }
      req.body[field] = Math.trunc(n);
    };
    coerceIntField('credits');
    coerceIntField('semester');
    coerceIntField('maxStudents');

    // Extra guard: maxStudents must be >= 1 if provided
    if (req.body && 'maxStudents' in req.body && Number.isFinite(req.body.maxStudents) && req.body.maxStudents < 1) {
      return res.status(400).json({
        success: false,
        message: 'maxStudents must be at least 1'
      });
    }

    const receivedMaxStudents = req.body?.maxStudents;
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      course,
      ...(process.env.NODE_ENV !== 'production'
        ? { debug: { receivedMaxStudents, savedMaxStudents: course?.maxStudents } }
        : {})
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const courseObjectId = course._id;

    // Unregister all students from this course
    const registrationsResult = await Registration.deleteMany({
      courseId: courseObjectId
    });

    // Remove all waitlist entries for this course
    const waitlistResult = await Waitlist.deleteMany({
      courseId: courseObjectId
    });

    // Deallocate course from all teachers (keep history but mark as deallocated)
    const allocationsResult = await Allocation.updateMany(
      { courseId: courseObjectId, status: 'allocated' },
      { $set: { status: 'deallocated' } }
    );

    // Remove timetable entries for this course
    const timetableResult = await Timetable.deleteMany({
      courseId: courseObjectId
    });

    await Course.findByIdAndDelete(courseObjectId);

    res.json({
      success: true,
      message: 'Course and related data deleted successfully',
      meta: {
        unregisteredStudents: registrationsResult.deletedCount || 0,
        removedWaitlistEntries: waitlistResult.deletedCount || 0,
        deallocatedTeachers: allocationsResult.modifiedCount || 0,
        removedTimetableEntries: timetableResult.deletedCount || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

