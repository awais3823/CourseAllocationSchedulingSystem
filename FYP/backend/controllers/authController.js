const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const generateToken = require('../utils/generateToken');
const { validationResult } = require('express-validator');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, name, role, semester, program, degreeLevel } = req.body;

    // Check if email exists in PendingUser collection (added by admin)
    const pendingUser = await PendingUser.findOne({
      email: email.toLowerCase().trim()
    });

    if (!pendingUser) {
      return res.status(403).json({
        success: false,
        message: 'Email not found in system. Please contact admin to add your email first.'
      });
    }

    // Use registration number from admin-assigned PendingUser record
    const registrationNo = pendingUser.registrationNo.trim();

    // Check if user already exists in User collection
    const existingUser = await User.findOne({
      $or: [{ email }, { registrationNo }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or registration number'
      });
    }

    // Get role from PendingUser (admin-assigned role)
    const assignedRole = pendingUser.role.toLowerCase();

    // If role is provided in request, verify it matches the assigned role
    if (role && role.toLowerCase() !== assignedRole) {
      return res.status(400).json({
        success: false,
        message: `Role mismatch. Expected role: ${pendingUser.role}`
      });
    }

    // Validate student-specific fields if role is student
    if (assignedRole === 'student') {
      if (!semester) {
        return res.status(400).json({
          success: false,
          message: 'Semester is required for students'
        });
      }
      if (!program) {
        return res.status(400).json({
          success: false,
          message: 'Program is required for students'
        });
      }
      if (!degreeLevel) {
        return res.status(400).json({
          success: false,
          message: 'Degree level is required for students'
        });
      }
    }

    // Create user with role from PendingUser
    const user = await User.create({
      registrationNo,
      email,
      password,
      name,
      role: assignedRole, // Use role from PendingUser
      ...(assignedRole === 'student' && { semester, program, degreeLevel })
    });

    // Remove from PendingUser collection after successful registration
    try {
      const deleted = await PendingUser.findOneAndDelete({ 
        email: email.toLowerCase().trim() 
      });
      if (!deleted) {
        // Fallback: try deleting by registration number if email deletion didn't work
        await PendingUser.findOneAndDelete({ 
          registrationNo: registrationNo.trim() 
        });
      }
    } catch (deleteError) {
      // Log error but don't fail registration if deletion fails
      console.error('Error deleting pending user:', deleteError);
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        registrationNo: user.registrationNo,
        email: user.email,
        name: user.name,
        role: user.role,
        ...(user.role === 'student' && { 
          semester: user.semester, 
          program: user.program,
          degreeLevel: user.degreeLevel 
        })
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Normalize email to lowercase and trim (matching User schema)
    const normalizedEmail = email.toLowerCase().trim();

    // Find user and include password
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email. Please sign up or contact admin to add your email.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        registrationNo: user.registrationNo,
        email: user.email,
        name: user.name,
        role: user.role,
        ...(user.role === 'student' && { 
          semester: user.semester, 
          program: user.program,
          degreeLevel: user.degreeLevel 
        })
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Login failed. Please try again.'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

