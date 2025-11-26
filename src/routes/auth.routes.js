const express = require('express');
const router = express.Router();
const User = require('../models/user.model.js');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('./emailService');

// --- دالة لإنشاء توكن JWT ---
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', // صلاحية التوكن 30 يوماً
    });
};

// --- POST /api/auth/register ---
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // التحقق مما إذا كان المستخدم موجوداً بالفعل
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ 
                message: userExists.email === email ? 
                    'البريد الإلكتروني مسجل مسبقاً' : 
                    'اسم المستخدم مسجل مسبقاً'
            });
        }

        // إنشاء كود تحقق
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // إنشاء مستخدم جديد
        const user = await User.create({
            username,
            email,
            password,
            emailVerificationToken: verificationCode,
            emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 ساعة
        });

        // 🆕 إرسال إيميل حقيقي بدل console.log
        const emailSent = await sendVerificationEmail(email, verificationCode);
        
        if (!emailSent) {
            // إذا فشل إرسال الإيميل، احذف المستخدم
            await User.findByIdAndDelete(user._id);
            return res.status(500).json({ message: 'فشل إرسال كود التحقق. يرجى المحاولة مرة أخرى.' });
        }
        
        // إرجاع رسالة للمستخدم لتفعيل الحساب
        res.status(201).json({ 
            message: 'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني.',
            requiresVerification: true,
            email: email // إرجاع الإيميل لإظهاره في واجهة التحقق
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'فشل إنشاء الحساب' });
    }
});

// --- POST /api/auth/login ---
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
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }
    try {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            balance: user.balance,
            isAdmin: user.isAdmin
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// 🆕 إرسال كود التحقق - محدث
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

        // 🆕 إرسال إيميل حقيقي بدل console.log
        const emailSent = await sendVerificationEmail(email, verificationCode);
        
        if (!emailSent) {
            return res.status(500).json({ message: 'فشل إرسال كود التحقق' });
        }
        
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

// 🆕 POST /api/auth/forgot-password - محدث
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
        }

        // البحث عن المستخدم
        const user = await User.findOne({ email });
        
        // لأسباب أمنية، لا نخبر المستخدم إذا كان البريد غير موجود
        if (!user) {
            return res.json({ 
                message: 'إذا كان البريد الإلكتروني مسجلاً، سيصلك رابط إعادة التعيين قريباً.' 
            });
        }

        // إنشاء توكن إعادة التعيين
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 1 * 60 * 60 * 1000; // صلاحية ساعة واحدة
        
        await user.save();

        // 🆕 إرسال إيميل حقيقي بدل console.log
        const emailSent = await sendPasswordResetEmail(email, resetToken);
        
        if (!emailSent) {
            return res.status(500).json({ message: 'فشل إرسال كود إعادة التعيين' });
        }
        
        res.json({ 
            message: 'تم إرسال كود إعادة التعيين إلى بريدك الإلكتروني.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'فشل إرسال رابط التعيين' });
    }
});

// 🆕 POST /api/auth/reset-password - إعادة تعيين كلمة المرور
router.post('/reset-password', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;

        if (!email || !token || !newPassword) {
            return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
        }

        // البحث عن المستخدم مع التحقق من التوكن ومدى صلاحيته
        const user = await User.findOne({
            email,
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' });
        }

        // تحديث كلمة المرور
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save();

        res.json({ message: 'تم إعادة تعيين كلمة المرور بنجاح' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'فشل إعادة تعيين كلمة المرور' });
    }
});

module.exports = router;
