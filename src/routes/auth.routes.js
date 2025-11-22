const express = require('express');
const router = express.Router();
const User = require('../models/user.model.js');
const jwt = require('jsonwebtoken');

// --- دالة لإنشاء توكن JWT ---
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', // صلاحية التوكن 30 يوماً
    });
};

// --- POST /api/auth/register ---
// لإنشاء حساب مستخدم جديد
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // التحقق مما إذا كان المستخدم موجوداً بالفعل
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'البريد الإلكتروني أو اسم المستخدم مسجل بالفعل.' });
        }

        // إنشاء مستخدم جديد (سيتم تشفير كلمة المرور تلقائياً بفضل الكود في الموديل)
        const user = await User.create({
            username,
            email,
            password,
        });

        // إذا تم إنشاء المستخدم بنجاح، قم بتسجيل دخوله مباشرة
        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'بيانات المستخدم غير صالحة.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- POST /api/auth/login ---
// لتسجيل دخول المستخدم
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // البحث عن المستخدم عن طريق البريد الإلكتروني
        const user = await User.findOne({ email });

        // التحقق من وجود المستخدم ومطابقة كلمة المرور
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
