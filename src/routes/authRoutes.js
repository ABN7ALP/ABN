const express = require('express');
const router = express.Router();
const { getRegisterPage, registerUser, getLoginPage } = require('../controllers/authController');

// مسار عرض صفحة التسجيل
router.get('/register', getRegisterPage);

// مسار إرسال بيانات التسجيل
router.post('/register', registerUser);

// مسار عرض صفحة تسجيل الدخول
router.get('/login', getLoginPage);


module.exports = router;
