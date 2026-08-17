const Registration = require('../models/Registration');
const Course = require('../models/Course');
const User = require('../models/User');
const Waitlist = require('../models/Waitlist');
const mongoose = require('mongoose');
const OverloadRequest = require('../models/OverloadRequest');
const { MAX_SEMESTER } = require('../config/constants');

const MAX_CREDITS_WITHOUT_APPROVAL = 18;
const ABSOLUTE_MAX_CREDITS = 21;

const getCurrentRegisteredCredits = async (studentId, semesterFilter = null) => {
  const regs = await Registration.find({
    studentId,
    status: 'registered'
  }).populate('courseId', 'credits semester');

  return regs.reduce((sum, reg) => {
    const c = reg.courseId;
    if (semesterFilter !== null) {
      const cSem = c && typeof c.semester === 'number' ? c.semester : Number.parseInt(c?.semester, 10);
      if (!Number.isFinite(cSem) || cSem !== semesterFilter) return sum;
    }
    const credits = c && typeof c.credits === 'number' ? c.credits : 0;
    return sum + credits;
  }, 0);
};

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

const getLatestCompletedAttempt = async ({ studentId, courseId }) => {
  return await Registration.findOne({
    studentId,
    courseId,
    status: 'completed',
    marks: { $ne: null }
  }).sort({ attempt: -1, evaluatedAt: -1, updatedAt: -1 });
};

// @desc    Register for a course
// @route   POST /api/registrations
// @access  Private/Student
exports.registerCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const studentId = req.user.id;

    // Check if student role
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can register for courses'
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const studentSemester = typeof student.semester === 'number' ? student.semester : Number.parseInt(student.semester, 10);
    const courseSemester = typeof course.semester === 'number' ? course.semester : Number.parseInt(course.semester, 10);

    if (!Number.isFinite(studentSemester) || studentSemester < 1 || studentSemester > MAX_SEMESTER) {
      return res.status(400).json({ success: false, message: `Invalid student semester (1-${MAX_SEMESTER})` });
    }
    if (!Number.isFinite(courseSemester) || courseSemester < 1 || courseSemester > MAX_SEMESTER) {
      return res.status(400).json({ success: false, message: `Invalid course semester (1-${MAX_SEMESTER})` });
    }

    // Cannot register beyond current semester
    if (courseSemester > studentSemester) {
      return res.status(400).json({
        success: false,
        message: `You can only register courses up to your current semester (Semester ${studentSemester}).`
      });
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({
      studentId,
      courseId,
      status: 'registered'
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this course'
      });
    }

    // Disallow re-register if already passed with 60+
    const latestCompleted = await getLatestCompletedAttempt({ studentId, courseId });
    if (latestCompleted && typeof latestCompleted.marks === 'number' && latestCompleted.marks >= 60) {
      return res.status(400).json({
        success: false,
        message: 'You have already passed this course (60+). You cannot register it again.'
      });
    }

    // Older semester courses: deferred first-time OR improvement/retake after a prior attempt
    if (courseSemester < studentSemester) {
      if (latestCompleted && typeof latestCompleted.marks === 'number') {
        if (latestCompleted.marks >= 60) {
          return res.status(400).json({
            success: false,
            message: 'You cannot re-register a previous semester course that you already passed (60+).'
          });
        }
        // Improvement: 50-59, retake: <50
        if (latestCompleted.marks < 0 || latestCompleted.marks >= 60) {
          return res.status(400).json({ success: false, message: 'Not eligible for improvement/retake.' });
        }
      }
      // No completed attempt → deferred/backlog registration allowed (prerequisites checked below)
    }

    // Check registration deadline
    const now = new Date();
    if (course.registrationEndDate && now > course.registrationEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }
    if (course.registrationStartDate && now < course.registrationStartDate) {
      return res.status(400).json({
        success: false,
        message: 'Registration has not started yet'
      });
    }

    // Check course capacity
    const currentRegistrations = await Registration.countDocuments({
      courseId,
      status: 'registered'
    });

    if (currentRegistrations >= course.maxStudents) {
      // Check if already on waitlist
      const existingWaitlist = await Waitlist.findOne({
        studentId,
        courseId
      });

      if (existingWaitlist) {
        return res.status(400).json({
          success: false,
          message: `Course is full. You are already on the waitlist at position ${existingWaitlist.position}`
        });
      }

      // Add to waitlist
      const waitlistCount = await Waitlist.countDocuments({ courseId });
      const waitlist = await Waitlist.create({
        studentId,
        courseId,
        position: waitlistCount + 1
      });

      return res.status(200).json({
        success: true,
        waitlisted: true,
        message: `Course is full. You have been added to the waitlist at position ${waitlist.position}`,
        waitlist
      });
    }

    // Credit hour limit enforcement (<=18 allowed, 19-21 requires admin approval, >21 blocked)
    // Credit cap is enforced per semester load (not across all semesters/lifetime).
    const currentCredits = await getCurrentRegisteredCredits(studentId, courseSemester);
    const requestedTotalCredits = currentCredits + (course.credits || 0);

    if (requestedTotalCredits > ABSOLUTE_MAX_CREDITS) {
      return res.status(400).json({
        success: false,
        message: `Cannot register: exceeds ${ABSOLUTE_MAX_CREDITS} credit hour limit for Semester ${courseSemester}`
      });
    }

    if (requestedTotalCredits > MAX_CREDITS_WITHOUT_APPROVAL) {
      const approved = await OverloadRequest.findOne({
        studentId,
        courseId,
        status: 'approved'
      }).sort({ decisionDate: -1, updatedAt: -1 });

      if (!approved) {
        return res.status(400).json({
          success: false,
          message: `Approval required: this registration would make your Semester ${courseSemester} total ${requestedTotalCredits} credit hours (allowed without approval: ${MAX_CREDITS_WITHOUT_APPROVAL}). Please request overload approval first.`
        });
      }
    }

    // Check prerequisites
    if (course.prerequisites && course.prerequisites.length > 0) {
      // Populate prerequisites to get course details
      await course.populate('prerequisites', 'courseCode courseName');
      // Completed prerequisite = latest completed attempt has marks >= 50
      const prereqIds = course.prerequisites.map((p) => (p?._id ? p._id : p));
      const latestCompletedByCourse = await Registration.aggregate([
        {
          $match: {
            studentId: new mongoose.Types.ObjectId(studentId),
            status: 'completed',
            marks: { $ne: null },
            courseId: { $in: prereqIds }
          }
        },
        { $sort: { attempt: -1, evaluatedAt: -1, updatedAt: -1 } },
        {
          $group: {
            _id: '$courseId',
            marks: { $first: '$marks' }
          }
        }
      ]);
      const passedPrereqCourseIds = new Set(
        latestCompletedByCourse
          .filter((x) => typeof x.marks === 'number' && x.marks >= 50)
          .map((x) => x._id.toString())
      );

      const missingPrerequisites = course.prerequisites.filter((prereq) => {
        const prereqId = prereq._id ? prereq._id.toString() : prereq.toString();
        return !passedPrereqCourseIds.has(prereqId);
      });

      if (missingPrerequisites.length > 0) {
        const missingNames = missingPrerequisites.map(prereq => 
          prereq.courseCode || prereq.toString()
        );
        return res.status(400).json({
          success: false,
          message: `Missing prerequisites: ${missingNames.join(', ')}. Please complete these courses first.`
        });
      }
    }

    // Remove from waitlist if exists
    await Waitlist.findOneAndDelete({ studentId, courseId });

    // Attempt number (supports improvement/retake)
    const lastAttempt = await Registration.findOne({ studentId, courseId }).sort({ attempt: -1 });
    const attempt = lastAttempt && typeof lastAttempt.attempt === 'number' ? lastAttempt.attempt + 1 : 1;

    // Create registration
    const registration = await Registration.create({
      studentId,
      courseId,
      attempt,
      status: 'registered'
    });

    // Check if there's a waitlist and notify next student
    const nextWaitlist = await Waitlist.findOne({ courseId }).sort({ position: 1 });
    if (nextWaitlist) {
      // Update waitlist positions
      await Waitlist.updateMany(
        { courseId, position: { $gt: nextWaitlist.position } },
        { $inc: { position: -1 } }
      );
      await Waitlist.findByIdAndUpdate(nextWaitlist._id, { notified: true });
    }

    await registration.populate('courseId');

    res.status(201).json({
      success: true,
      registration
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this course'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get student's registered courses
// @route   GET /api/registrations
// @access  Private/Student
exports.getMyRegistrations = async (req, res) => {
  try {
    const studentId = req.user.id;

    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can view their registrations'
      });
    }

    const registrations = await Registration.find({
      studentId
    }).populate('courseId', 'courseId courseName courseCode credits semester program degreeLevels');

    res.json({
      success: true,
      count: registrations.length,
      registrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Drop a course
// @route   DELETE /api/registrations/:id
// @access  Private/Student
exports.dropCourse = async (req, res) => {
  try {
    const registration = await Registration.findOne({
      _id: req.params.id,
      studentId: req.user.id
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    registration.status = 'dropped';
    await registration.save();

    // Check if there's a waitlist and auto-enroll next student
    const nextWaitlist = await Waitlist.findOne({ courseId: registration.courseId })
      .sort({ position: 1 })
      .populate('studentId');

    if (nextWaitlist) {
      const course = await Course.findById(registration.courseId);
      const currentRegistrations = await Registration.countDocuments({
        courseId: registration.courseId,
        status: 'registered'
      });

      if (currentRegistrations < course.maxStudents) {
        // Auto-enroll waitlisted student
        await Registration.create({
          studentId: nextWaitlist.studentId._id,
          courseId: registration.courseId,
          status: 'registered'
        });

        // Remove from waitlist and update positions
        await Waitlist.findByIdAndDelete(nextWaitlist._id);
        await Waitlist.updateMany(
          { courseId: registration.courseId, position: { $gt: nextWaitlist.position } },
          { $inc: { position: -1 } }
        );
      }
    }

    res.json({
      success: true,
      message: 'Course dropped successfully',
      registration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all registrations (Admin)
// @route   GET /api/registrations/all
// @access  Private/Admin
exports.getAllRegistrations = async (req, res) => {
  try {
    const { courseId, studentId } = req.query;
    const query = { status: 'registered' };

    if (courseId) {
      query.courseId = courseId;
    }

    if (studentId) {
      query.studentId = studentId;
    }

    const registrations = await Registration.find(query)
      .populate('studentId', 'name registrationNo email')
      .populate('courseId', 'courseId courseName courseCode');

    res.json({
      success: true,
      count: registrations.length,
      registrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get student's waitlist
// @route   GET /api/registrations/waitlist
// @access  Private/Student
exports.getMyWaitlist = async (req, res) => {
  try {
    const studentId = req.user.id;

    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can view their waitlist'
      });
    }

    const waitlist = await Waitlist.find({ studentId })
      .populate('courseId', 'courseId courseName courseCode credits semester')
      .sort({ position: 1 });

    res.json({
      success: true,
      count: waitlist.length,
      waitlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove from waitlist
// @route   DELETE /api/registrations/waitlist/:id
// @access  Private/Student
exports.removeFromWaitlist = async (req, res) => {
  try {
    const waitlist = await Waitlist.findOne({
      _id: req.params.id,
      studentId: req.user.id
    });

    if (!waitlist) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found'
      });
    }

    const courseId = waitlist.courseId;
    const position = waitlist.position;

    await Waitlist.findByIdAndDelete(waitlist._id);

    // Update positions of remaining waitlist entries
    await Waitlist.updateMany(
      { courseId, position: { $gt: position } },
      { $inc: { position: -1 } }
    );

    res.json({
      success: true,
      message: 'Removed from waitlist successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

