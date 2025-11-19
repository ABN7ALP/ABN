const express = require('express');
const router = express.Router();
const { getUsersPage, getOrdersPage, updateOrderStatus, updateUserBalance } = require('../controllers/adminController'); // <-- إضافة updateUserBalance
const { isAdmin } = require('../middleware/adminMiddleware');

router.use(isAdmin);

router.get('/', (req, res) => res.redirect('/admin/users'));
router.get('/dashboard', (req, res) => res.redirect('/admin/users'));

// مسارات إدارة المستخدمين
router.get('/users', getUsersPage);
router.post('/users/update-balance/:id', updateUserBalance); // <-- مسار جديد لتحديث الرصيد

// مسارات إدارة الطلبات
router.get('/orders', getOrdersPage);
router.post('/orders/update-status/:id', updateOrderStatus);

module.exports = router;
