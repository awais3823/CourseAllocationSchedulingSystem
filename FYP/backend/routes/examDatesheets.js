const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const {
  generateFromExcel,
  generateFromSystem,
  getAllDatesheets,
  getDatesheetById,
  moveDatesheetEntry,
  addDatesheetEntry,
  updateDatesheetEntry,
  deleteDatesheetEntry,
  deleteDatesheet
} = require('../controllers/examDatesheetController');

// Use memory storage for Excel uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'));
    }
  }
});

// Generate exam datesheet from Excel upload
router.post(
  '/generate-from-excel',
  protect,
  authorize('admin'),
  upload.single('file'),
  generateFromExcel
);

// Generate exam datesheet from registrations + allocations in the database
router.post('/generate-from-system', protect, authorize('admin'), generateFromSystem);

// List all datesheets (admin, teacher, student can view)
router.get('/', protect, authorize('admin', 'teacher', 'student'), getAllDatesheets);

// Get single datesheet with derived views (admin, teacher, student can view)
router.get('/:id', protect, authorize('admin', 'teacher', 'student'), getDatesheetById);

// Add / update / delete single entry (admin)
router.post('/:id/entry', protect, authorize('admin'), addDatesheetEntry);
router.put('/:id/entry', protect, authorize('admin'), updateDatesheetEntry);
router.delete('/:id/entry/:entryIndex', protect, authorize('admin'), deleteDatesheetEntry);

// Move one exam entry to another date/slot (drag-and-drop support)
router.put('/:id/move-entry', protect, authorize('admin'), moveDatesheetEntry);

// Delete datesheet
router.delete('/:id', protect, authorize('admin'), deleteDatesheet);

module.exports = router;





