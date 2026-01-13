const express = require('express');
const router = express.Router();
const {
  registerCourse,
  getMyRegistrations,
  dropCourse,
  getAllRegistrations,
  getMyWaitlist,
  removeFromWaitlist
} = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, registerCourse);
router.get('/', protect, getMyRegistrations);
router.get('/all', protect, authorize('admin'), getAllRegistrations);
router.get('/waitlist', protect, getMyWaitlist);
router.delete('/waitlist/:id', protect, removeFromWaitlist);
router.delete('/:id', protect, dropCourse);

module.exports = router;

