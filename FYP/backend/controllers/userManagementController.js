const PendingUser = require('../models/PendingUser');
const XLSX = require('xlsx');

// @desc    Get all pending users
// @route   GET /api/users/pending
// @access  Private/Admin
exports.getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await PendingUser.find()
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
