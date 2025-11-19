const express = require('express');
const router = express.Router();
const { 
    getRegisterPage, 
    registerUser, 
    getLoginPage, 
    loginUser,
    logoutUser 
} = require('../controllers/authController');

// مسارات التسجيل
router.get('/register', getRegisterPage);
router.post('/register', registerUser);

// مسارات تسجيل الدخول
router.get('/login', getLoginPage);
router.post('/login', loginUser);

// مسار تسجيل الخروج
router.get('/logout', logoutUser);

module.exports = router;
