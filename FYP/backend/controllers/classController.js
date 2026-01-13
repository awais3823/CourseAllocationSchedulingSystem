const Class = require('../models/Class');

// @desc    Get all classes
// @route   GET /api/classes
// @access  Private
exports.getClasses = async (req, res) => {
  try {
    const classes = await Class.find().sort({ className: 1 });

    res.json({
      success: true,
      count: classes.length,
      classes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single class
// @route   GET /api/classes/:id
// @access  Private
exports.getClass = async (req, res) => {
  try {
    const classRoom = await Class.findById(req.params.id);

    if (!classRoom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    res.json({
      success: true,
      class: classRoom
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add classroom
// @route   POST /api/classes
// @access  Private/Admin
exports.addClass = async (req, res) => {
  try {
    const classRoom = await Class.create(req.body);

    res.status(201).json({
      success: true,
      class: classRoom
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Classroom with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update classroom
// @route   PUT /api/classes/:id
// @access  Private/Admin
exports.updateClass = async (req, res) => {
  try {
    const classRoom = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!classRoom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    res.json({
      success: true,
      class: classRoom
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove classroom
// @route   DELETE /api/classes/:id
// @access  Private/Admin
exports.removeClass = async (req, res) => {
  try {
    const classRoom = await Class.findByIdAndDelete(req.params.id);

    if (!classRoom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    res.json({
      success: true,
      message: 'Classroom removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

