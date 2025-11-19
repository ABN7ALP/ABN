const express = require('express');
const router = express.Router();
const { getUsersPage } = require('../controllers/adminController');
const { isAdmin } = require('../middleware/adminMiddleware');

// حماية جميع مسارات المشرف
router.use(isAdmin);

// المسار الرئيسي للوحة التحكم (يوجه إلى صفحة المستخدمين)
router.get('/', (req, res) => res.redirect('/admin/users'));
router.get('/dashboard', (req, res) => res.redirect('/admin/users'));

// مسار صفحة إدارة المستخدمين
router.get('/users', getUsersPage);

module.exports = router;
