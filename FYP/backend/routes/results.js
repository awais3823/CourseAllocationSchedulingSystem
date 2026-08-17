const express = require('express');
const router = express.Router();

const {
  getMyResults,
  listStudentsWithRegistrations,
  getStudentRegistrationsForMarks,
  setRegistrationMarks,
  updateStudentSemester,
  recalculateAllStudentSemesters
} = require('../controllers/resultsController');

const { protect, authorize } = require('../middleware/auth');

// Student
router.get('/me', protect, authorize('student'), getMyResults);

// Admin
router.get('/admin/students', protect, authorize('admin'), listStudentsWithRegistrations);
router.get('/admin/students/:studentId/registrations', protect, authorize('admin'), getStudentRegistrationsForMarks);
router.patch('/admin/students/:studentId/semester', protect, authorize('admin'), updateStudentSemester);
router.put('/admin/registrations/:registrationId/marks', protect, authorize('admin'), setRegistrationMarks);
router.post('/admin/recalculate-semesters', protect, authorize('admin'), recalculateAllStudentSemesters);

module.exports = router;

