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
                balance: user.balance,
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
                balance: user.balance,
                isAdmin: user.isAdmin,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/auth/me - جلب بيانات المستخدم المسجل دخوله حالياً
router.get('/me', async (req, res) => {
    // هذا المسار يفترض أننا سنرسل التوكن في المستقبل
    // حالياً، سنعتمد على الـ ID الذي يرسله العميل
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }
    try {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // ******** نحدد البيانات التي نريد إرجاعها ********
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            balance: user.balance,
            isAdmin: user.isAdmin // <-- حقل المدير 
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// 🆕 إرسال كود التحقق
router.post('/send-verification', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }

        // إنشاء كود تحقق
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.emailVerificationToken = verificationCode;
        user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 ساعة
        
        await user.save();

        // هنا يمكنك إرسال الإيميل (ستحتخدم خدمة مثل SendGrid)
        console.log(`كود التحقق لـ ${email}: ${verificationCode}`);
        
        res.json({ message: 'تم إرسال كود التحقق إلى بريدك الإلكتروني' });
    } catch (error) {
        res.status(500).json({ message: 'فشل إرسال كود التحقق' });
    }
});

// 🆕 التحقق من الكود
router.post('/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findOne({ 
            email,
            emailVerificationToken: code,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'كود التحقق غير صالح أو منتهي' });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({ message: 'تم التحقق من البريد الإلكتروني بنجاح' });
    } catch (error) {
        res.status(500).json({ message: 'فشل التحقق من البريد' });
    }
});

module.exports = router;
