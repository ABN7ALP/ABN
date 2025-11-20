const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// @route   GET /auth/register
// @desc    عرض صفحة إنشاء حساب
router.get('/register', authController.getRegisterPage);

// @route   POST /auth/register
// @desc    تسجيل مستخدم جديد
router.post('/register', authController.registerUser);

// @route   GET /auth/login
// @desc    عرض صفحة تسجيل الدخول
router.get('/login', authController.getLoginPage);

// @route   POST /auth/login
// @desc    تسجيل دخول المستخدم
router.post('/login', authController.loginUser);

// @route   GET /auth/logout
// @desc    تسجيل خروج المستخدم
router.get('/logout', authController.logoutUser);

module.exports = router;
