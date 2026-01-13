const express = require('express');
const router = express.Router();
const {
  allocateCourse,
  deallocateCourse,
  getAllocations,
  getMyCourses
} = require('../controllers/allocationController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('admin'), allocateCourse);
router.get('/', protect, getAllocations);
router.get('/my-courses', protect, getMyCourses);
router.delete('/:id', protect, authorize('admin'), deallocateCourse);

module.exports = router;

