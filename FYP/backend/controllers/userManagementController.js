const PendingUser = require('../models/PendingUser');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Waitlist = require('../models/Waitlist');
const Allocation = require('../models/Allocation');
const Timetable = require('../models/Timetable');
const XLSX = require('xlsx');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildSearchFilter = (search, fields) => {
  const term = typeof search === 'string' ? search.trim() : '';
  if (!term) return {};
  const regex = new RegExp(escapeRegex(term), 'i');
  return { $or: fields.map((field) => ({ [field]: regex })) };
};

// @desc    Get all pending users
// @route   GET /api/users/pending
// @access  Private/Admin
exports.getPendingUsers = async (req, res) => {
  try {
    const searchFilter = buildSearchFilter(req.query.search, [
      'registrationNo',
      'email',
      'role'
    ]);

    const pendingUsers = await PendingUser.find(searchFilter)
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      count: pendingUsers.length,
      pendingUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add a single pending user
// @route   POST /api/users/pending
// @access  Private/Admin
exports.addPendingUser = async (req, res) => {
  try {
    const { registrationNo, email, role } = req.body;

    // Check if pending user already exists
    const existingUser = await PendingUser.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { registrationNo: registrationNo.trim() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Pending user with this email or registration number already exists'
      });
    }

    const pendingUser = await PendingUser.create({
      registrationNo: registrationNo.trim(),
      email: email.toLowerCase().trim(),
      role: role.toLowerCase().trim(),
      addedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      pendingUser
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Pending user with this email or registration number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload pending users from Excel file
// @route   POST /api/users/pending/upload
// @access  Private/Admin
exports.uploadPendingUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or has no valid data'
      });
    }

    // Validate required columns
    const requiredColumns = ['registrationNo', 'email', 'role'];
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingColumns.join(', ')}`
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const registrationNo = String(row.registrationNo || '').trim();
        const email = String(row.email || '').toLowerCase().trim();
        const role = String(row.role || '').toLowerCase().trim();

        // Validate required fields
        if (!registrationNo || !email || !role) {
          results.failed++;
          results.errors.push({
            row: i + 2, // +2 because Excel rows start at 1 and we have a header
            message: 'Missing required fields (registrationNo, email, or role)'
          });
          continue;
        }

        // Validate role
        if (!['student', 'teacher', 'admin'].includes(role)) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            registrationNo,
            email,
            message: `Invalid role: ${role}. Must be student, teacher, or admin`
          });
          continue;
        }

        // Check if pending user already exists
        const existingUser = await PendingUser.findOne({
          $or: [
            { email },
            { registrationNo }
          ]
        });

        if (existingUser) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            registrationNo,
            email,
            message: 'Pending user with this email or registration number already exists'
          });
          continue;
        }

        // Create pending user
        await PendingUser.create({
          registrationNo,
          email,
          role,
          addedBy: req.user.id
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          registrationNo: row.registrationNo || 'N/A',
          email: row.email || 'N/A',
          message: error.message || 'Failed to process row'
        });
      }
    }

    res.json({
      success: true,
      message: `Upload completed. ${results.success} users added, ${results.failed} failed.`,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process Excel file'
    });
  }
};

// @desc    Delete pending user
// @route   DELETE /api/users/pending/:id
// @access  Private/Admin
exports.deletePendingUser = async (req, res) => {
  try {
    const pendingUser = await PendingUser.findById(req.params.id);

    if (!pendingUser) {
      return res.status(404).json({
        success: false,
        message: 'Pending user not found'
      });
    }

    await PendingUser.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Pending user deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get users by role
// @route   GET /api/users?role=teacher
// @access  Private/Admin
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.query;
    
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role parameter is required'
      });
    }

    // Validate role
    const validRoles = ['student', 'teacher', 'admin'];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    const searchFilter = buildSearchFilter(req.query.search, [
      'registrationNo',
      'email',
      'name'
    ]);

    const users = await User.find({
      role: role.toLowerCase(),
      ...searchFilter
    })
      .select('name email registrationNo role')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete user and related data
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUserWithData = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting the currently logged-in admin for safety
    if (user.role === 'admin' && req.user && user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account'
      });
    }

    const userId = user._id;
    const meta = {};

    if (user.role === 'student') {
      // Remove course registrations and waitlist entries
      const registrationsResult = await Registration.deleteMany({ studentId: userId });
      const waitlistResult = await Waitlist.deleteMany({ studentId: userId });

      meta.removedRegistrations = registrationsResult.deletedCount || 0;
      meta.removedWaitlistEntries = waitlistResult.deletedCount || 0;
    }

    if (user.role === 'teacher') {
      // Deallocate courses and remove timetable entries for this teacher
      const allocationsResult = await Allocation.updateMany(
        { teacherId: userId, status: 'allocated' },
        { $set: { status: 'deallocated' } }
      );
      const timetableResult = await Timetable.deleteMany({ teacherId: userId });

      meta.deallocatedCourses = allocationsResult.modifiedCount || 0;
      meta.removedTimetableEntries = timetableResult.deletedCount || 0;
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'User and related data deleted successfully',
      meta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
