const express = require('express');
const router = express.Router();
const { 
    getUsersPage, 
    getOrdersPage, 
    updateOrderStatus, 
    updateUserBalance 
} = require('../controllers/adminController');
const { isAdmin } = require('../middleware/adminMiddleware');

// =================== التعديل الجذري هنا ===================
// لا نستخدم router.use(isAdmin) هنا

// المسار الرئيسي للوحة التحكم
// نطبق الوسيط 'isAdmin' هنا مباشرة قبل دالة المسار
router.get('/', isAdmin, (req, res) => {
    res.redirect('/admin/users');
});

router.get('/dashboard', isAdmin, (req, res) => {
    res.redirect('/admin/users');
});

// مسارات إدارة المستخدمين
// نطبق الوسيط 'isAdmin' على كل مسار بشكل منفصل
router.get('/users', isAdmin, getUsersPage);
router.post('/users/update-balance/:id', isAdmin, updateUserBalance);

// مسارات إدارة الطلبات
// نطبق الوسيط 'isAdmin' على كل مسار بشكل منفصل
router.get('/orders', isAdmin, getOrdersPage);
router.post('/orders/update-status/:id', isAdmin, updateOrderStatus);

module.exports = router;
