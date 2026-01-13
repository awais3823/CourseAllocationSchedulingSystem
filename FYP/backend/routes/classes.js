const express = require('express');
const router = express.Router();
const {
  getClasses,
  getClass,
  addClass,
  updateClass,
  removeClass
} = require('../controllers/classController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getClasses);
router.get('/:id', protect, getClass);
router.post('/', protect, authorize('admin'), addClass);
router.put('/:id', protect, authorize('admin'), updateClass);
router.delete('/:id', protect, authorize('admin'), removeClass);

module.exports = router;

