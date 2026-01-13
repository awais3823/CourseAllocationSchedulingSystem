const User = require('../models/User');
const Course = require('../models/Course');
const Registration = require('../models/Registration');
const PendingUser = require('../models/PendingUser');
const Timetable = require('../models/Timetable');
const Allocation = require('../models/Allocation');
const Class = require('../models/Class');

// @desc    Get admin dashboard statistics
// @route   GET /api/statistics
// @access  Private/Admin
exports.getStatistics = async (req, res) => {
  try {
    // User statistics
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const pendingUsers = await PendingUser.countDocuments();

    // Course statistics
    const totalCourses = await Course.countDocuments();
    const coursesBySemester = await Course.aggregate([
      {
        $group: {
          _id: '$semester',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Registration statistics
    const totalRegistrations = await Registration.countDocuments({ status: 'registered' });
    const droppedRegistrations = await Registration.countDocuments({ status: 'dropped' });
    
    // Course capacity utilization
    const courses = await Course.find();
    const capacityStats = await Promise.all(
      courses.map(async (course) => {
        const registered = await Registration.countDocuments({
          courseId: course._id,
          status: 'registered'
        });
        return {
          courseId: course._id,
          courseCode: course.courseCode,
          courseName: course.courseName,
          maxStudents: course.maxStudents,
          registered: registered,
          available: course.maxStudents - registered,
          utilization: ((registered / course.maxStudents) * 100).toFixed(1)
        };
      })
    );

    const fullCourses = capacityStats.filter(c => c.registered >= c.maxStudents).length;
    const nearlyFullCourses = capacityStats.filter(c => 
      c.registered >= c.maxStudents * 0.8 && c.registered < c.maxStudents
    ).length;

    // Timetable statistics
    const totalTimetableEntries = await Timetable.countDocuments({ status: 'active' });
    const timetableByDay = await Timetable.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$day',
          count: { $sum: 1 }
        }
      }
    ]);

    // Allocation statistics
    const totalAllocations = await Allocation.countDocuments({ status: 'allocated' });
    const allocationsByTeacher = await Allocation.aggregate([
      { $match: { status: 'allocated' } },
      {
        $group: {
          _id: '$teacherId',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      {
        $project: {
          teacherName: { $arrayElemAt: ['$teacher.name', 0] },
          count: 1
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Classroom statistics
    const totalClassrooms = await Class.countDocuments();
    const totalClassroomCapacity = await Class.aggregate([
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$capacity' }
        }
      }
    ]);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentRegistrations = await Registration.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      status: 'registered'
    });

    const recentDrops = await Registration.countDocuments({
      updatedAt: { $gte: sevenDaysAgo },
      status: 'dropped'
    });

    res.json({
      success: true,
      statistics: {
        users: {
          totalStudents,
          totalTeachers,
          totalAdmins,
          pendingUsers,
          total: totalStudents + totalTeachers + totalAdmins
        },
        courses: {
          totalCourses,
          coursesBySemester,
          fullCourses,
          nearlyFullCourses,
          capacityStats: capacityStats.sort((a, b) => b.utilization - a.utilization).slice(0, 10)
        },
        registrations: {
          totalRegistrations,
          droppedRegistrations,
          recentRegistrations,
          recentDrops
        },
        timetable: {
          totalEntries: totalTimetableEntries,
          byDay: timetableByDay
        },
        allocations: {
          totalAllocations,
          topTeachers: allocationsByTeacher
        },
        classrooms: {
          totalClassrooms,
          totalCapacity: totalClassroomCapacity[0]?.totalCapacity || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};




