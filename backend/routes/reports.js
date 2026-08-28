const express = require('express');
const router = express.Router();
const { getDashboardStats, getUserStats, toggleUserStatus, getRecentActivities } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/dashboard', protect, roleCheck('admin'), getDashboardStats);
router.get('/users', protect, roleCheck('admin'), getUserStats);
router.get('/activities', protect, roleCheck('admin'), getRecentActivities);
router.put('/users/:id/toggle', protect, roleCheck('admin'), toggleUserStatus);

module.exports = router;
