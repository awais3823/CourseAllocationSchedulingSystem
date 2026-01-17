const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  register,
  login,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('registrationNo').trim().notEmpty().withMessage('Registration number is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').optional().isIn(['student', 'teacher', 'admin']).withMessage('Invalid role'),
  body('semester').optional().isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
  body('program').optional().trim().notEmpty().withMessage('Program is required for students'),
  body('degreeLevel').optional().isIn(['BS', 'Master', 'MPhil']).withMessage('Degree level must be BS, Master, or MPhil')
];

router.post('/register', registerValidation, register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;

