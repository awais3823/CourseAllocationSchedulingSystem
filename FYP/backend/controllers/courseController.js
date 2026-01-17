const Course = require('../models/Course');
const Allocation = require('../models/Allocation');

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
      query.program = program;
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
      course
    });
  } catch (error) {
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
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

