const express = require('express');
const router = express.Router();
const User = require('../models/user.model.js');
const jwt = require('jsonwebtoken');
const { sendActivationEmail, sendPasswordResetEmail } = require('./emailConfig.js'); // 🆕 استيراد دالة الإيميل

// --- دالة لإنشاء توكن JWT ---
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// --- POST /api/auth/register ---
// --- POST /api/auth/register ---
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ 
                message: userExists.email === email ? 
                    'البريد الإلكتروني مسجل مسبقاً' : 
                    'اسم المستخدم مسجل مسبقاً'
            });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const user = await User.create({
            username,
            email,
            password,
            emailVerificationToken: verificationCode,
            emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
            emailVerified: false
        });

        // 🆕 إرسال إيميل تفعيل الحساب (الجديد)
        const emailSent = await sendActivationEmail(email, verificationCode);
        
        if (!emailSent) {
            console.log(`🔐 كود تفعيل الحساب للمستخدم ${email}: ${verificationCode}`);
        }

        res.status(201).json({ 
            message: emailSent ? 
                'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.' :
                'تم إنشاء الحساب بنجاح. يرجى مراجعة الكونسول للتحقق.',
            requiresVerification: true,
            email: email
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'فشل إنشاء الحساب' });
    }
});
// --- POST /api/auth/login ---
// --- POST /api/auth/login ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // البحث عن المستخدم عن طريق البريد الإلكتروني
        const user = await User.findOne({ email });

        // التحقق من وجود المستخدم ومطابقة كلمة المرور
        if (user && (await user.matchPassword(password))) {
            // 🆕 التحقق من أن البريد مفعل
            if (!user.emailVerified) {
                return res.status(401).json({ 
                    message: 'يرجى تفعيل بريدك الإلكتروني أولاً. تحقق من بريدك الوارد.' 
                });
            }

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
        user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
        
        await user.save();

        // 🆕 إرسال إيميل إعادة تعيين كلمة المرور
        const emailSent = await sendPasswordResetEmail(email, verificationCode);
        
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
// --- POST /api/auth/forgot-password ---
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
        }

        const user = await User.findOne({ email });
        
        if (!user) {
            return res.json({ 
                message: 'إذا كان البريد الإلكتروني مسجلاً، سيصلك كود إعادة التعيين قريباً.' 
            });
        }

        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 1 * 60 * 60 * 1000;
        
        await user.save();

        // 🆕 إرسال إيميل إعادة تعيين كلمة المرور (الجديد)
        const emailSent = await sendPasswordResetEmail(email, resetToken);
        
        if (!emailSent) {
            console.log(`🔑 كود إعادة تعيين كلمة المرور لـ ${email}: ${resetToken}`);
        }

        res.json({ 
            message: emailSent ?
                'إذا كان البريد الإلكتروني مسجلاً، سيصلك كود إعادة التعيين قريباً.' :
                'تم إنشاء كود التعيين. يرجى مراجعة الكونسول.',
            resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'فشل إرسال رابط التعيين' });
    }
});
// 🆕 POST /api/auth/reset-password - إعادة تعيين كلمة المرور
// 🆕 تحديث route إعادة تعيين كلمة المرور
router.post('/reset-password', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;

        if (!email || !token || !newPassword) {
            return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
        }

        // البحث عن المستخدم
        const user = await User.findOne({
            email,
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' });
        }

        // 🆕 التحقق مما إذا كلمة المرور الجديدة مطابقة للقديمة
        const isSamePassword = await user.matchPassword(newPassword);
        if (isSamePassword) {
            return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة' });
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
