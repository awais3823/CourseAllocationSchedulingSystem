const Allocation = require('../models/Allocation');
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Allocate course to teacher
// @route   POST /api/allocations
// @access  Private/Admin
exports.allocateCourse = async (req, res) => {
  try {
    const { teacherId } = req.body;
    const courseIdsRaw = req.body.courseIds ?? (req.body.courseId ? [req.body.courseId] : []);
    const courseIds = Array.isArray(courseIdsRaw) ? courseIdsRaw.filter(Boolean) : [];

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: 'teacherId is required'
      });
    }

    if (courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one courseId (courseIds[])'
      });
    }

    // Check if teacher exists and is a teacher
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Validate courses exist
    const courses = await Course.find({ _id: { $in: courseIds } }).select('_id');
    const existingCourseIds = new Set(courses.map((c) => c._id.toString()));
    const missingCourseIds = courseIds.filter((id) => !existingCourseIds.has(id.toString()));
    if (missingCourseIds.length > 0) {
      return res.status(404).json({
        success: false,
        message: `Course not found: ${missingCourseIds.join(', ')}`
      });
    }

    // Find already-allocated for this teacher among selected courses
    const existingAllocations = await Allocation.find({
      teacherId,
      courseId: { $in: courseIds },
      status: 'allocated'
    }).select('courseId');
    const alreadyAllocated = new Set(existingAllocations.map((a) => a.courseId.toString()));

    const toCreate = courseIds.filter((id) => !alreadyAllocated.has(id.toString()));
    if (toCreate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected course(s) already allocated to this teacher'
      });
    }

    const createdAllocations = await Allocation.insertMany(
      toCreate.map((courseId) => ({ teacherId, courseId, status: 'allocated' })),
      { ordered: false }
    );

    // Populate for response
    const populated = await Allocation.find({ _id: { $in: createdAllocations.map((a) => a._id) } })
      .populate('teacherId', 'name email registrationNo')
      .populate('courseId', 'courseId courseName courseCode credits semester program')
      .sort({ createdAt: -1 });

    res.status(201).json({
      success: true,
      createdCount: populated.length,
      skippedAlreadyAllocatedCount: alreadyAllocated.size,
      allocations: populated
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

