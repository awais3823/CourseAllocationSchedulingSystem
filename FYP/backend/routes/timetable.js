const express = require('express');
const router = express.Router();
const {
  generateTimetable,
  getTimetable,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  deleteTimetable
} = require('../controllers/timetableController');
const { protect, authorize } = require('../middleware/auth');

router.post('/generate', protect, authorize('admin'), generateTimetable);
router.get('/', protect, getTimetable);
router.post('/', protect, authorize('admin'), createTimetableEntry);
router.put('/:id', protect, authorize('admin'), updateTimetableEntry);
router.delete('/:id', protect, authorize('admin'), deleteTimetableEntry);
router.delete('/', protect, authorize('admin'), deleteTimetable);

module.exports = router;

