const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body } = require('express-validator');
const {
  addPendingUser,
  uploadPendingUsers,
  getPendingUsers,
  deletePendingUser,
  getUsersByRole,
  deleteUserWithData
} = require('../controllers/userManagementController');
const { protect, authorize } = require('../middleware/auth');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'));
    }
  }
});

// Validation rules for adding single pending user
const addPendingUserValidation = [
  body('registrationNo').trim().notEmpty().withMessage('Registration number is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('role').isIn(['student', 'teacher', 'admin']).withMessage('Invalid role. Must be student, teacher, or admin')
];

// Routes
router.post('/pending', protect, authorize('admin'), addPendingUserValidation, addPendingUser);
router.post('/pending/upload', protect, authorize('admin'), upload.single('file'), uploadPendingUsers);
router.get('/pending', protect, authorize('admin'), getPendingUsers);
router.delete('/pending/:id', protect, authorize('admin'), deletePendingUser);
router.get('/', protect, authorize('admin'), getUsersByRole);
router.delete('/:id', protect, authorize('admin'), deleteUserWithData);

module.exports = router;




