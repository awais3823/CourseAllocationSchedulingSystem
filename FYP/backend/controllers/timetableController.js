const Timetable = require('../models/Timetable');
const Registration = require('../models/Registration');
const { generateTimetable, checkConflicts } = require('../utils/timetableGenerator');
const { SEMESTER_NUMBERS } = require('../config/constants');

const getDefaultAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  // Academic year assumed to roll over in August.
  const startYear = month >= 7 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
};

// @desc    Generate timetable automatically
// @route   POST /api/timetable/generate
// @access  Private/Admin
exports.generateTimetable = async (req, res) => {
  try {
    const academicYear = req.body.academicYear || getDefaultAcademicYear();

    // Default time slots and days
    const timeSlots = req.body.timeSlots || [
      '09:00-10:30',
      '10:30-12:00',
      '12:00-13:30',
      '14:00-15:30',
      '15:30-17:00'
    ];

    const days = req.body.days || [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday'
    ];

    // Delete existing timetable for this academic year (all semesters)
    await Timetable.deleteMany({ academicYear });

    // Generate timetable for all degree levels (BS, Master, MPhil) and all semesters (1-12)
    const degreeLevels = ['BS', 'Master', 'MPhil'];
    const semesters = SEMESTER_NUMBERS;
    const allTimetables = [];
    const allUnresolvedConflicts = [];
    let totalScheduled = 0;
    let totalConflicts = 0;

    for (const degreeLevel of degreeLevels) {
      for (const semester of semesters) {
        // Generate timetable for this degree level and semester
        const result = await generateTimetable(
          degreeLevel, 
          academicYear, 
          timeSlots, 
          days, 
          req.body.priorities || {},
          semester // Pass semester to filter courses
        );
        
        allTimetables.push(...result.timetables);
        allUnresolvedConflicts.push(...result.unresolvedConflicts);
        totalScheduled += result.timetables.length;
        totalConflicts += result.unresolvedConflicts.length;
      }
    }

    const populatedTimetables = await Timetable.find({
      academicYear,
      status: 'active'
    })
      .populate('courseId', 'courseId courseName courseCode')
      .populate('teacherId', 'name email')
      .populate('classId', 'className capacity location')
      .sort({ semester: 1, day: 1, startTime: 1 });

    res.status(201).json({
      success: true,
      message: `Timetable generated for Academic Year ${academicYear} (all semesters 1-12). ${totalScheduled} courses scheduled. ${totalConflicts} courses have conflicts.`,
      totalScheduled,
      totalConflicts,
      timetables: populatedTimetables,
      unresolvedConflicts: allUnresolvedConflicts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get timetable
// @route   GET /api/timetable
// @access  Private
exports.getTimetable = async (req, res) => {
  try {
    const { semester, academicYear, teacherId, courseId, day, studentId } = req.query;
    const query = { status: 'active' };

    if (semester) {
      query.semester = parseInt(semester);
    }

    if (academicYear) {
      query.academicYear = academicYear;
    }

    if (teacherId) {
      query.teacherId = teacherId;
    }

    if (courseId) {
      query.courseId = courseId;
    }

    if (day) {
      query.day = day;
    }

    // If student and filterMyCourses is true, get their registered courses' timetables only
    // Otherwise, show all courses (filterMyCourses defaults to false)
    const filterMyCourses = req.query.filterMyCourses === 'true';
    if (filterMyCourses && (studentId || (req.user && req.user.role === 'student'))) {
      const student = studentId || req.user.id;
      const registrations = await Registration.find({
        studentId: student,
        status: 'registered'
      });

      const courseIds = registrations.map(reg => reg.courseId);
      if (courseIds.length > 0) {
        query.courseId = { $in: courseIds };
      } else {
        // If no registered courses, return empty result
        return res.json({
          success: true,
          count: 0,
          timetables: []
        });
      }
    }

    const timetables = await Timetable.find(query)
      .populate('courseId', 'courseId courseName courseCode credits')
      .populate('teacherId', 'name email')
      .populate('classId', 'className capacity location')
      .sort({ day: 1, startTime: 1 });

    res.json({
      success: true,
      count: timetables.length,
      timetables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create timetable entry
// @route   POST /api/timetable
// @access  Private/Admin
exports.createTimetableEntry = async (req, res) => {
  try {
    const { courseId, teacherId, classId, day, startTime, endTime, semester, academicYear } = req.body;

    // Check for conflicts
    const conflicts = await checkConflicts(
      courseId,
      teacherId,
      classId,
      day,
      startTime,
      endTime,
      semester,
      academicYear
    );

    if (conflicts.classroom.length > 0 || conflicts.teacher.length > 0 || conflicts.student.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Conflicts detected',
        conflicts
      });
    }

    const timetable = await Timetable.create({
      courseId,
      teacherId,
      classId,
      day,
      startTime,
      endTime,
      semester,
      academicYear,
      status: 'active'
    });

    await timetable.populate('courseId', 'courseId courseName courseCode');
    await timetable.populate('teacherId', 'name email');
    await timetable.populate('classId', 'className capacity location');

    res.status(201).json({
      success: true,
      timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update timetable entry
// @route   PUT /api/timetable/:id
// @access  Private/Admin
exports.updateTimetableEntry = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable entry not found'
      });
    }

    const {
      courseId = timetable.courseId,
      teacherId = timetable.teacherId,
      classId = timetable.classId,
      day = timetable.day,
      startTime = timetable.startTime,
      endTime = timetable.endTime,
      semester = timetable.semester,
      academicYear = timetable.academicYear
    } = req.body;

    // Check for conflicts (excluding current entry)
    const conflicts = await checkConflicts(
      courseId,
      teacherId,
      classId,
      day,
      startTime,
      endTime,
      semester,
      academicYear,
      timetable._id
    );

    if (conflicts.classroom.length > 0 || conflicts.teacher.length > 0 || conflicts.student.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Conflicts detected',
        conflicts
      });
    }

    timetable.courseId = courseId;
    timetable.teacherId = teacherId;
    timetable.classId = classId;
    timetable.day = day;
    timetable.startTime = startTime;
    timetable.endTime = endTime;
    timetable.semester = semester;
    timetable.academicYear = academicYear;

    await timetable.save();

    await timetable.populate('courseId', 'courseId courseName courseCode');
    await timetable.populate('teacherId', 'name email');
    await timetable.populate('classId', 'className capacity location');

    res.json({
      success: true,
      timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete timetable entry
// @route   DELETE /api/timetable/:id
// @access  Private/Admin
exports.deleteTimetableEntry = async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndDelete(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Timetable entry deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete entire timetable (optionally filter by academic year/semester)
// @route   DELETE /api/timetable
// @access  Private/Admin
exports.deleteTimetable = async (req, res) => {
  try {
    const { semester, academicYear } = req.query;

    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = parseInt(semester, 10);

    const result = await Timetable.deleteMany(filter);

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} timetable entries`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

