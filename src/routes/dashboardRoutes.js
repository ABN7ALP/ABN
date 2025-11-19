const express = require('express');
const router = express.Router();
const { getDashboardPage } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware'); // سننشئ هذا الملف الآن

// حماية جميع المسارات في هذا الملف
router.use(protect);

// مسار عرض الصفحة الرئيسية
router.get('/', getDashboardPage);

module.exports = router;
