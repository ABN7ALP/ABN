const express = require('express');
const router = express.Router();
const { 
    getUsersPage, 
    getOrdersPage, 
    updateOrderStatus, 
    updateUserBalance // الآن هذه الدالة سيتم استيرادها بشكل صحيح
} = require('../controllers/adminController');
const { isAdmin } = require('../middleware/adminMiddleware');

// المسار الرئيسي للوحة التحكم
router.get('/', isAdmin, (req, res) => {
    res.redirect('/admin/users');
});

router.get('/dashboard', isAdmin, (req, res) => {
    res.redirect('/admin/users');
});

// مسارات إدارة المستخدمين
router.get('/users', isAdmin, getUsersPage);
router.post('/users/update-balance/:id', isAdmin, updateUserBalance);

// مسارات إدارة الطلبات
router.get('/orders', isAdmin, getOrdersPage);
router.post('/orders/update-status/:id', isAdmin, updateOrderStatus);

module.exports = router;
