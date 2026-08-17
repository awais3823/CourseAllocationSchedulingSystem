const express = require('express');
const router = express.Router();

const {
  getTeacherCourseAttendance,
  markCourseSessionAttendance,
  getMyAttendance
} = require('../controllers/attendanceController');

const { protect, authorize } = require('../middleware/auth');

router.get('/teacher/courses', protect, authorize('teacher'), getTeacherCourseAttendance);
router.post('/teacher/courses/:courseId/sessions', protect, authorize('teacher'), markCourseSessionAttendance);
router.get('/me', protect, authorize('student'), getMyAttendance);

module.exports = router;
