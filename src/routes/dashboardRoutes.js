const express = require('express');
const router = express.Router();
const { getDashboardPage, createOrder } = require('../controllers/dashboardController'); // <-- إضافة createOrder
const { protect } = require('../middleware/authMiddleware');

// حماية جميع المسارات في هذا الملف
router.use(protect);

// مسار عرض الصفحة الرئيسية
router.get('/', getDashboardPage);

// مسار إنشاء طلب جديد
router.post('/create-order', createOrder); // <-- إضافة جديدة

module.exports = router;
