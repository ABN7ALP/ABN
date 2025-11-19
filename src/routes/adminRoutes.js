const express = require('express');
const router = express.Router();
const { getUsersPage, getOrdersPage, updateOrderStatus } = require('../controllers/adminController'); // <-- إضافة الدوال الجديدة
const { isAdmin } = require('../middleware/adminMiddleware');

// حماية جميع مسارات المشرف
router.use(isAdmin);

// المسار الرئيسي للوحة التحكم
router.get('/', (req, res) => res.redirect('/admin/users'));
router.get('/dashboard', (req, res) => res.redirect('/admin/users'));

// مسارات إدارة المستخدمين
router.get('/users', getUsersPage);

// مسارات إدارة الطلبات
router.get('/orders', getOrdersPage); // <-- مسار جديد لعرض الطلبات
router.post('/orders/update-status/:id', updateOrderStatus); // <-- مسار جديد لتحديث حالة الطلب

module.exports = router;
