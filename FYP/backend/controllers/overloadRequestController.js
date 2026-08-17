const OverloadRequest = require('../models/OverloadRequest');
const Registration = require('../models/Registration');
const Course = require('../models/Course');

const MAX_CREDITS_WITHOUT_APPROVAL = 18;
const ABSOLUTE_MAX_CREDITS = 21;

const getCurrentRegisteredCredits = async (studentId) => {
  const regs = await Registration.find({
    studentId,
    status: 'registered'
  }).populate('courseId', 'credits');

  return regs.reduce((sum, reg) => {
    const c = reg.courseId;
    const credits = c && typeof c.credits === 'number' ? c.credits : 0;
    return sum + credits;
  }, 0);
};

// @desc    Create overload request for 19–21 credits
// @route   POST /api/overload-requests
// @access  Private/Student
exports.createOverloadRequest = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.body;

    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can request overload approvals'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const currentCredits = await getCurrentRegisteredCredits(studentId);
    const requestedTotalCredits = currentCredits + (course.credits || 0);

    if (requestedTotalCredits <= MAX_CREDITS_WITHOUT_APPROVAL) {
      return res.status(400).json({
        success: false,
        message: 'Approval is only required for more than 18 credit hours'
      });
    }

    if (requestedTotalCredits > ABSOLUTE_MAX_CREDITS) {
      return res.status(400).json({
        success: false,
        message: `You cannot register for more than ${ABSOLUTE_MAX_CREDITS} credit hours`
      });
    }

    const existingPending = await OverloadRequest.findOne({
      studentId,
      courseId,
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'An approval request for this course is already pending'
      });
    }

    const request = await OverloadRequest.create({
      studentId,
      courseId,
      currentCredits,
      requestedTotalCredits
    });

    await request.populate('courseId', 'courseCode courseName credits');

    res.status(201).json({
      success: true,
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current student's overload requests
// @route   GET /api/overload-requests/my
// @access  Private/Student
exports.getMyOverloadRequests = async (req, res) => {
  try {
    const studentId = req.user.id;

    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can view overload requests'
      });
    }

    const requests = await OverloadRequest.find({ studentId })
      .sort({ createdAt: -1 })
      .populate('courseId', 'courseCode courseName credits');

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all overload requests (admin)
// @route   GET /api/overload-requests
// @access  Private/Admin
exports.getAllOverloadRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }

    const requests = await OverloadRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('studentId', 'name registrationNo email')
      .populate('courseId', 'courseCode courseName credits semester program');

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Approve overload request (auto-register course)
// @route   POST /api/overload-requests/:id/approve
// @access  Private/Admin
exports.approveOverloadRequest = async (req, res) => {
  try {
    const adminId = req.user.id;
    const request = await OverloadRequest.findById(req.params.id)
      .populate('courseId', 'credits maxStudents registrationStartDate registrationEndDate')
      .populate('studentId', 'role');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Overload request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    if (!request.studentId || request.studentId.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Only student overload requests can be approved'
      });
    }

    const course = request.courseId;
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found for this request'
      });
    }

    const studentId = request.studentId._id;

    // Recalculate credits and capacity at approval time
    const currentCredits = await getCurrentRegisteredCredits(studentId);
    const requestedTotalCredits = currentCredits + (course.credits || 0);

    if (requestedTotalCredits > ABSOLUTE_MAX_CREDITS) {
      request.status = 'rejected';
      request.decisionBy = adminId;
      request.decisionDate = new Date();
      await request.save();
      return res.status(400).json({
        success: false,
        message: `Cannot approve. This would exceed the ${ABSOLUTE_MAX_CREDITS} credit limit`
      });
    }

    const activeRegs = await Registration.countDocuments({
      courseId: course._id,
      status: 'registered'
    });

    if (activeRegs >= course.maxStudents) {
      request.status = 'rejected';
      request.decisionBy = adminId;
      request.decisionDate = new Date();
      await request.save();
      return res.status(400).json({
        success: false,
        message: 'Cannot approve. Course is already full'
      });
    }

    const now = new Date();
    if (course.registrationEndDate && now > course.registrationEndDate) {
      request.status = 'rejected';
      request.decisionBy = adminId;
      request.decisionDate = new Date();
      await request.save();
      return res.status(400).json({
        success: false,
        message: 'Cannot approve. Registration deadline has passed'
      });
    }

    // Create registration
    const lastAttempt = await Registration.findOne({ studentId, courseId: course._id }).sort({ attempt: -1 });
    const attempt = lastAttempt && typeof lastAttempt.attempt === 'number' ? lastAttempt.attempt + 1 : 1;

    const registration = await Registration.create({
      studentId,
      courseId: course._id,
      attempt,
      status: 'registered'
    });

    request.status = 'approved';
    request.decisionBy = adminId;
    request.decisionDate = new Date();
    await request.save();

    res.json({
      success: true,
      message: 'Overload request approved and course registered successfully',
      registration,
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reject overload request
// @route   POST /api/overload-requests/:id/reject
// @access  Private/Admin
exports.rejectOverloadRequest = async (req, res) => {
  try {
    const adminId = req.user.id;
    const request = await OverloadRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Overload request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    request.status = 'rejected';
    request.decisionBy = adminId;
    request.decisionDate = new Date();
    await request.save();

    res.json({
      success: true,
      message: 'Overload request rejected',
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

