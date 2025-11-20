const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// حماية جميع مسارات الإشعارات
router.use(protect);

router.get('/', notificationController.getNotificationsPage);
router.post('/mark-all-read', notificationController.markAllAsRead);

module.exports = router;
