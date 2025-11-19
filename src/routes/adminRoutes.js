const express = require('express');
const router = express.Router();
const { 
    getUsersPage, 
    getOrdersPage, 
    updateOrderStatus, 
    updateUserBalance,
    getFundsPage,             // <-- إضافة جديدة
    updateFundRequestStatus   // <-- إضافة جديدة
} = require('../controllers/adminController');
const { isAdmin } = require('../middleware/adminMiddleware');

// ... (المسارات الأخرى بدون تغيير) ...
router.get('/', isAdmin, (req, res) => res.redirect('/admin/users'));
router.get('/dashboard', isAdmin, (req, res) => res.redirect('/admin/users'));
router.get('/users', isAdmin, getUsersPage);
router.post('/users/update-balance/:id', isAdmin, updateUserBalance);
router.get('/orders', isAdmin, getOrdersPage);
router.post('/orders/update-status/:id', isAdmin, updateOrderStatus);

// مسارات إدارة طلبات شحن الرصيد
router.get('/funds', isAdmin, getFundsPage); // <-- مسار جديد
router.post('/funds/update-status/:id', isAdmin, updateFundRequestStatus); // <-- مسار جديد

module.exports = router;
