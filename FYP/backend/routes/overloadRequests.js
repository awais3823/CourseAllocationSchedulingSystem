const express = require('express');
const router = express.Router();
const {
  createOverloadRequest,
  getMyOverloadRequests,
  getAllOverloadRequests,
  approveOverloadRequest,
  rejectOverloadRequest
} = require('../controllers/overloadRequestController');
const { protect, authorize } = require('../middleware/auth');

// Student endpoints
router.post('/', protect, createOverloadRequest);
router.get('/my', protect, getMyOverloadRequests);

// Admin endpoints
router.get('/', protect, authorize('admin'), getAllOverloadRequests);
router.post('/:id/approve', protect, authorize('admin'), approveOverloadRequest);
router.post('/:id/reject', protect, authorize('admin'), rejectOverloadRequest);

module.exports = router;

