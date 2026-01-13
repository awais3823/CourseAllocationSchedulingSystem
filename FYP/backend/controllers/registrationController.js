const Registration = require('../models/Registration');
const Course = require('../models/Course');
const User = require('../models/User');
const Waitlist = require('../models/Waitlist');

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

    // Check prerequisites
    if (course.prerequisites && course.prerequisites.length > 0) {
      // Populate prerequisites to get course details
      await course.populate('prerequisites', 'courseCode courseName');
      
      const studentRegistrations = await Registration.find({
        studentId,
        status: 'registered'
      }).populate('courseId');

      // Get completed course IDs (as strings for comparison)
      const completedCourseIds = studentRegistrations.map(reg => 
        reg.courseId._id ? reg.courseId._id.toString() : null
      ).filter(id => id !== null);

      // Check which prerequisites are missing
      const missingPrerequisites = course.prerequisites.filter(prereq => {
        const prereqId = prereq._id ? prereq._id.toString() : prereq.toString();
        return !completedCourseIds.includes(prereqId);
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

    // Create registration
    const registration = await Registration.create({
      studentId,
      courseId,
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

