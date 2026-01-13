const Allocation = require('../models/Allocation');
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Allocate course to teacher
// @route   POST /api/allocations
// @access  Private/Admin
exports.allocateCourse = async (req, res) => {
  try {
    const { teacherId, courseId } = req.body;

    // Check if teacher exists and is a teacher
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
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

    // Check if already allocated
    const existingAllocation = await Allocation.findOne({
      teacherId,
      courseId,
      status: 'allocated'
    });

    if (existingAllocation) {
      return res.status(400).json({
        success: false,
        message: 'Course already allocated to this teacher'
      });
    }

    // Create allocation
    const allocation = await Allocation.create({
      teacherId,
      courseId,
      status: 'allocated'
    });

    await allocation.populate('teacherId', 'name email registrationNo');
    await allocation.populate('courseId', 'courseId courseName courseCode');

    res.status(201).json({
      success: true,
      allocation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Deallocate course from teacher
// @route   DELETE /api/allocations/:id
// @access  Private/Admin
exports.deallocateCourse = async (req, res) => {
  try {
    const allocation = await Allocation.findById(req.params.id);

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Allocation not found'
      });
    }

    allocation.status = 'deallocated';
    await allocation.save();

    res.json({
      success: true,
      message: 'Course deallocated successfully',
      allocation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all allocations
// @route   GET /api/allocations
// @access  Private
exports.getAllocations = async (req, res) => {
  try {
    const { teacherId, courseId, status } = req.query;
    const query = {};

    if (teacherId) {
      query.teacherId = teacherId;
    }

    if (courseId) {
      query.courseId = courseId;
    }

    if (status) {
      query.status = status;
    } else {
      query.status = 'allocated';
    }

    const allocations = await Allocation.find(query)
      .populate('teacherId', 'name email registrationNo')
      .populate('courseId', 'courseId courseName courseCode credits semester program')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: allocations.length,
      allocations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get teacher's allocated courses
// @route   GET /api/allocations/my-courses
// @access  Private/Teacher
exports.getMyCourses = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can view their allocated courses'
      });
    }

    const allocations = await Allocation.find({
      teacherId: req.user.id,
      status: 'allocated'
    }).populate('courseId', 'courseId courseName courseCode credits semester program');

    res.json({
      success: true,
      count: allocations.length,
      allocations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

