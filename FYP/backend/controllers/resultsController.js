const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Course = require('../models/Course');
const User = require('../models/User');
const { MAX_SEMESTER } = require('../config/constants');

const computeGrade = (marks) => {
  const m = typeof marks === 'number' ? marks : Number(marks);
  if (!Number.isFinite(m) || m < 0 || m > 100) return null;
  if (m >= 80) return { grade: 'A', gradePoint: 4.0 };
  if (m >= 76) return { grade: 'A-', gradePoint: 3.8 };
  if (m >= 72) return { grade: 'B+', gradePoint: 3.5 };
  if (m >= 68) return { grade: 'B', gradePoint: 3.0 };
  if (m >= 64) return { grade: 'B-', gradePoint: 2.8 };
  if (m >= 60) return { grade: 'C+', gradePoint: 2.5 };
  if (m >= 55) return { grade: 'C', gradePoint: 2.0 };
  if (m >= 50) return { grade: 'D', gradePoint: 1.0 };
  return { grade: 'F', gradePoint: 0 };
};

const PASS_MARKS = 50;

const calcWeightedGpa = (rows) => {
  const totals = rows.reduce(
    (acc, r) => {
      const credits = typeof r.credits === 'number' ? r.credits : Number(r.credits);
      const gp = typeof r.gradePoint === 'number' ? r.gradePoint : Number(r.gradePoint);
      if (!Number.isFinite(credits) || credits <= 0) return acc;
      if (!Number.isFinite(gp) || gp < 0) return acc;
      acc.credits += credits;
      acc.points += gp * credits;
      return acc;
    },
    { credits: 0, points: 0 }
  );
  return totals.credits > 0 ? Number((totals.points / totals.credits).toFixed(2)) : 0;
};

const getSemesterStatus = async (studentId, semester) => {
  const agg = await Registration.aggregate([
    { $match: { studentId: new mongoose.Types.ObjectId(studentId), status: { $in: ['registered', 'completed'] } } },
    {
      $lookup: {
        from: Course.collection.name,
        localField: 'courseId',
        foreignField: '_id',
        as: 'course'
      }
    },
    { $unwind: '$course' },
    { $match: { 'course.semester': semester } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: {
            $cond: [{ $eq: ['$status', 'registered'] }, 1, 0]
          }
        }
      }
    }
  ]);

  return {
    total: agg?.[0]?.total ?? 0,
    pending: agg?.[0]?.pending ?? 0
  };
};

const advanceStudentSemesterIfEligible = async (studentId) => {
  const student = await User.findById(studentId);
  if (!student || student.role !== 'student' || typeof student.semester !== 'number') {
    return { changed: false, before: student?.semester, after: student?.semester };
  }

  const before = student.semester;
  let current = student.semester;

  // Advance while current semester has registrations and all of them are completed.
  while (current >= 1 && current < MAX_SEMESTER) {
    const status = await getSemesterStatus(student._id, current);
    if (status.total === 0 || status.pending > 0) break;
    current += 1;
  }

  if (current !== student.semester) {
    student.semester = current;
    await student.save();
    return { changed: true, before, after: current };
  }

  return { changed: false, before, after: current };
};

// @desc    Student: get my results (semester-wise + CGPA)
// @route   GET /api/results/me
// @access  Private/Student
exports.getMyResults = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can view results' });
    }

    const studentId = req.user.id;

    // Fetch completed registrations with course data
    const regs = await Registration.find({
      studentId,
      status: 'completed',
      marks: { $ne: null }
    })
      .populate('courseId', 'courseCode courseName credits semester program')
      .sort({ 'courseId.semester': 1, 'courseId.courseCode': 1, attempt: 1 });

    const rows = regs
      .filter((r) => r.courseId)
      .map((r) => ({
        registrationId: r._id,
        courseId: r.courseId._id,
        courseCode: r.courseId.courseCode,
        courseName: r.courseId.courseName,
        credits: r.courseId.credits,
        semester: r.courseId.semester,
        marks: r.marks,
        grade: r.grade,
        gradePoint: r.gradePoint,
        attendanceSummary: r.attendanceSummary || {
          totalSessions: 0,
          presentCount: 0,
          absentCount: 0,
          percentage: 0
        },
        attendanceLocked: !!r.attendanceLocked,
        attempt: r.attempt,
        evaluatedAt: r.evaluatedAt
      }));

    // Keep only latest attempt per course for GPA/CGPA calc
    const latestByCourse = new Map();
    for (const r of rows) {
      const key = r.courseId.toString();
      const prev = latestByCourse.get(key);
      if (!prev || (typeof r.attempt === 'number' && r.attempt > prev.attempt)) {
        latestByCourse.set(key, r);
      }
    }
    const latestRows = Array.from(latestByCourse.values());

    const bySemester = new Map();
    for (const r of latestRows) {
      const sem = typeof r.semester === 'number' ? r.semester : 0;
      if (!bySemester.has(sem)) bySemester.set(sem, []);
      bySemester.get(sem).push(r);
    }

    const semesters = Array.from(bySemester.keys()).sort((a, b) => a - b);
    const semesterResults = semesters.map((sem) => {
      const items = bySemester.get(sem).slice().sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''));
      const semesterGpa = calcWeightedGpa(items);
      return { semester: sem, semesterGpa, courses: items };
    });

    const cgpa = calcWeightedGpa(latestRows);

    res.json({
      success: true,
      semesterResults,
      cgpa
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin: list students with registrations
// @route   GET /api/results/admin/students
// @access  Private/Admin
exports.listStudentsWithRegistrations = async (req, res) => {
  try {
    const studentIds = await Registration.distinct('studentId', { status: { $in: ['registered', 'completed'] } });
    const students = await User.find({ _id: { $in: studentIds }, role: 'student' })
      .select('name registrationNo email semester program degreeLevel')
      .sort({ registrationNo: 1 });

    // Prevent stale client caches (avoids 304 with outdated IDs after reseeding)
    res.set('Cache-Control', 'no-store');

    res.json({ success: true, count: students.length, students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin: get a student's registered/completed courses (for mark entry)
// @route   GET /api/results/admin/students/:studentId/registrations
// @access  Private/Admin
exports.getStudentRegistrationsForMarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }

    const regs = await Registration.find({
      studentId,
      status: { $in: ['registered', 'completed'] }
    })
      .populate('courseId', 'courseCode courseName credits semester program')
      .sort({ createdAt: -1 });

    if (!regs.length) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = await User.findById(studentId).select('name registrationNo email role semester program degreeLevel');

    const registrations = regs
      .filter((r) => r.courseId)
      .map((r) => ({
        _id: r._id,
        course: r.courseId,
        status: r.status,
        attempt: r.attempt,
        marks: r.marks,
        grade: r.grade,
        gradePoint: r.gradePoint,
        attendanceSummary: r.attendanceSummary || {
          totalSessions: 0,
          presentCount: 0,
          absentCount: 0,
          percentage: 0
        },
        attendanceLocked: !!r.attendanceLocked,
        evaluatedAt: r.evaluatedAt,
        registrationDate: r.registrationDate
      }));

    // Prevent stale client caches (avoids 304 with outdated IDs after reseeding)
    res.set('Cache-Control', 'no-store');

    res.json({ success: true, student, count: registrations.length, registrations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin: enter/update marks for a registration
// @route   PUT /api/results/admin/registrations/:registrationId/marks
// @access  Private/Admin
exports.setRegistrationMarks = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { marks, studentSemester: studentSemesterBody } = req.body;

    if (!mongoose.Types.ObjectId.isValid(registrationId)) {
      return res.status(400).json({ success: false, message: 'Invalid registration id' });
    }

    const gradeInfo = computeGrade(marks);
    if (!gradeInfo) {
      return res.status(400).json({ success: false, message: 'Marks must be a number between 0 and 100' });
    }

    const reg = await Registration.findById(registrationId).populate('courseId', 'semester');
    if (!reg) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    if (reg.status === 'dropped') {
      return res.status(400).json({ success: false, message: 'Cannot enter marks for a dropped course' });
    }

    reg.marks = Number(marks);
    reg.grade = gradeInfo.grade;
    reg.gradePoint = gradeInfo.gradePoint;
    reg.status = 'completed';
    reg.evaluatedAt = new Date();
    if (reg.marks >= PASS_MARKS) {
      reg.attendanceLocked = true;
      reg.attendanceFinalizedAt = new Date();
    }
    await reg.save();

    let semesterAdvance = { changed: false, before: null, after: null, manual: false };

    if (studentSemesterBody !== undefined && studentSemesterBody !== null && studentSemesterBody !== '') {
      const newSem = Number(studentSemesterBody);
      if (!Number.isFinite(newSem) || newSem < 1 || newSem > MAX_SEMESTER) {
        return res.status(400).json({
          success: false,
          message: `studentSemester must be between 1 and ${MAX_SEMESTER}`
        });
      }
      const student = await User.findById(reg.studentId);
      if (student && student.role === 'student') {
        const before = student.semester;
        student.semester = newSem;
        await student.save();
        semesterAdvance = {
          changed: before !== newSem,
          before,
          after: newSem,
          manual: true
        };
      }
    } else {
      semesterAdvance = await advanceStudentSemesterIfEligible(reg.studentId);
    }

    res.json({
      success: true,
      registration: reg,
      semesterAdvance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin: set student current semester manually
// @route   PATCH /api/results/admin/students/:studentId/semester
// @access  Private/Admin
exports.updateStudentSemester = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { semester } = req.body;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }

    const newSem = Number(semester);
    if (!Number.isFinite(newSem) || newSem < 1 || newSem > MAX_SEMESTER) {
      return res.status(400).json({
        success: false,
        message: `semester must be between 1 and ${MAX_SEMESTER}`
      });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const before = student.semester;
    student.semester = newSem;
    await student.save();

    res.json({
      success: true,
      student: {
        _id: student._id,
        name: student.name,
        registrationNo: student.registrationNo,
        semester: student.semester
      },
      semesterAdvance: { changed: before !== newSem, before, after: newSem, manual: true }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin: recalculate semester progression for all students
// @route   POST /api/results/admin/recalculate-semesters
// @access  Private/Admin
exports.recalculateAllStudentSemesters = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('_id semester');
    let updated = 0;
    const changes = [];

    for (const s of students) {
      const result = await advanceStudentSemesterIfEligible(s._id);
      if (result.changed) {
        updated += 1;
        changes.push({
          studentId: s._id,
          from: result.before,
          to: result.after
        });
      }
    }

    res.json({
      success: true,
      message: `Semester recalculation complete. Updated ${updated} student(s).`,
      updatedCount: updated,
      changes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

