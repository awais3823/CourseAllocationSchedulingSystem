const Allocation = require('../models/Allocation');
const Course = require('../models/Course');
const Registration = require('../models/Registration');

const PASS_MARKS = 50;

const normalizeToDayUTC = (dateInput) => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const sameUTCDate = (a, b) => {
  if (!a || !b) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
};

const computeAttendanceSummary = (sessions = []) => {
  const totalSessions = sessions.length;
  const presentCount = sessions.filter((s) => s.status === 'present').length;
  const absentCount = totalSessions - presentCount;
  const percentage = totalSessions > 0 ? Number(((presentCount / totalSessions) * 100).toFixed(2)) : 0;
  return { totalSessions, presentCount, absentCount, percentage };
};

const sortByDateAsc = (sessions = []) =>
  sessions.slice().sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());

// @desc    Teacher: list my courses and enrolled students with attendance
// @route   GET /api/attendance/teacher/courses
// @access  Private/Teacher
exports.getTeacherCourseAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can view this data' });
    }

    const allocations = await Allocation.find({
      teacherId: req.user.id,
      status: 'allocated'
    }).populate('courseId', 'courseCode courseName credits semester program');

    const courseIds = allocations
      .map((a) => a.courseId?._id)
      .filter(Boolean);

    if (courseIds.length === 0) {
      return res.json({ success: true, count: 0, courses: [] });
    }

    const registrations = await Registration.find({
      courseId: { $in: courseIds },
      status: { $in: ['registered', 'completed'] }
    })
      .populate('studentId', 'name registrationNo email semester program')
      .populate('courseId', 'courseCode courseName credits semester program');

    const byCourse = new Map();
    allocations.forEach((allocation) => {
      if (!allocation.courseId) return;
      byCourse.set(allocation.courseId._id.toString(), {
        course: allocation.courseId,
        sessionDates: [],
        students: []
      });
    });

    registrations.forEach((reg) => {
      const key = reg.courseId?._id?.toString();
      if (!key || !byCourse.has(key)) return;
      const record = byCourse.get(key);

      (reg.attendanceSessions || []).forEach((s) => {
        if (!s.sessionDate) return;
        record.sessionDates.push(new Date(s.sessionDate).toISOString().slice(0, 10));
      });

      record.students.push({
        registrationId: reg._id,
        student: reg.studentId,
        status: reg.status,
        marks: reg.marks,
        passed: typeof reg.marks === 'number' ? reg.marks >= PASS_MARKS : false,
        attendanceSummary: reg.attendanceSummary || computeAttendanceSummary(reg.attendanceSessions || []),
        attendanceLocked: !!reg.attendanceLocked,
        attendanceSessions: sortByDateAsc(reg.attendanceSessions || []).map((s) => ({
          sessionDate: s.sessionDate,
          status: s.status,
          markedAt: s.markedAt
        }))
      });
    });

    const courses = Array.from(byCourse.values()).map((item) => ({
      ...item,
      sessionDates: Array.from(new Set(item.sessionDates)).sort(),
      students: item.students.sort((a, b) =>
        (a.student?.registrationNo || '').localeCompare(b.student?.registrationNo || '')
      )
    }));

    // Avoid stale browser cache right after attendance marking
    res.set('Cache-Control', 'no-store');

    res.json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Teacher: mark attendance for a course session
// @route   POST /api/attendance/teacher/courses/:courseId/sessions
// @access  Private/Teacher
exports.markCourseSessionAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can mark attendance' });
    }

    const { courseId } = req.params;
    const { sessionDate, attendance } = req.body || {};
    const normalizedDate = normalizeToDayUTC(sessionDate);

    if (!normalizedDate) {
      return res.status(400).json({ success: false, message: 'Valid sessionDate is required (YYYY-MM-DD)' });
    }
    if (!Array.isArray(attendance) || attendance.length === 0) {
      return res.status(400).json({ success: false, message: 'attendance list is required' });
    }

    const allocated = await Allocation.findOne({
      teacherId: req.user.id,
      courseId,
      status: 'allocated'
    });
    if (!allocated) {
      return res.status(403).json({ success: false, message: 'You are not allocated to this course' });
    }

    const requestedRegistrationIds = attendance.map((x) => x.registrationId).filter(Boolean);
    const regs = await Registration.find({
      _id: { $in: requestedRegistrationIds },
      courseId
    });

    if (regs.length !== requestedRegistrationIds.length) {
      return res.status(400).json({ success: false, message: 'Some attendance entries contain invalid registrationId' });
    }

    const updates = [];

    for (const reg of regs) {
      if (reg.status !== 'registered') {
        return res.status(400).json({
          success: false,
          message: 'Attendance can only be marked for students with active registered status'
        });
      }
      if (reg.attendanceLocked) {
        return res.status(400).json({
          success: false,
          message: 'Attendance is locked for one or more selected students'
        });
      }

      const input = attendance.find((x) => x.registrationId.toString() === reg._id.toString());
      if (!input || !['present', 'absent'].includes(input.status)) {
        return res.status(400).json({ success: false, message: 'Each entry requires present/absent status' });
      }

      const sessions = Array.isArray(reg.attendanceSessions) ? reg.attendanceSessions : [];
      const existing = sessions.find((s) => sameUTCDate(new Date(s.sessionDate), normalizedDate));

      if (existing) {
        existing.status = input.status;
        existing.markedAt = new Date();
      } else {
        sessions.push({
          sessionDate: normalizedDate,
          status: input.status,
          markedAt: new Date()
        });
      }

      reg.attendanceSessions = sortByDateAsc(sessions);
      reg.attendanceSummary = computeAttendanceSummary(reg.attendanceSessions);
      await reg.save();

      updates.push({
        registrationId: reg._id,
        attendanceSummary: reg.attendanceSummary
      });
    }

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      sessionDate: normalizedDate.toISOString().slice(0, 10),
      updatedCount: updates.length,
      updates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Student: get my attendance summary and sessions
// @route   GET /api/attendance/me
// @access  Private/Student
exports.getMyAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can view attendance' });
    }

    const regs = await Registration.find({
      studentId: req.user.id,
      status: 'registered'
    })
      .populate('courseId', 'courseCode courseName credits semester program')
      .sort({ createdAt: -1 });

    const attendance = regs
      .filter((r) => r.courseId)
      .map((r) => ({
        registrationId: r._id,
        course: r.courseId,
        status: r.status,
        marks: r.marks,
        passed: typeof r.marks === 'number' ? r.marks >= PASS_MARKS : false,
        attendanceLocked: !!r.attendanceLocked,
        attendanceSummary: r.attendanceSummary || computeAttendanceSummary(r.attendanceSessions || []),
        attendanceSessions: sortByDateAsc(r.attendanceSessions || []).map((s) => ({
          sessionDate: s.sessionDate,
          status: s.status
        }))
      }));

    // Avoid stale browser cache for student attendance page
    res.set('Cache-Control', 'no-store');

    res.json({
      success: true,
      count: attendance.length,
      attendance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
