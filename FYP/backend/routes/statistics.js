const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getStatistics } = require('../controllers/statisticsController');

router.route('/').get(protect, authorize('admin'), getStatistics);

module.exports = router;




