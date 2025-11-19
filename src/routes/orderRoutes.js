const express = require('express');
const router = express.Router();
const { getOrdersPage } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// حماية المسار (يجب أن يكون المستخدم مسجلاً ليرى طلباته)
router.use(protect);

// مسار عرض صفحة الطلبات
router.get('/', getOrdersPage);

module.exports = router;
