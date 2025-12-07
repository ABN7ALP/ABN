const express = require('express');
const router = express.Router();
const User = require('../models/user.model.js');
const UploadService = require('../services/uploadService.js'); // 🆕 استيراد خدمة الرفع
const jwt = require('jsonwebtoken');
const { sendActivationEmail, sendPasswordResetEmail } = require('./emailConfig.js');
const { registerRules, loginRules } = require('../middleware/validators');
const { 
    loginLimiter, 
    registerLimiter, 
    passwordResetLimiter, 
    emailVerificationLimiter 
} = require('../middleware/rateLimit');
const { createLog } = require('../services/logging.service');

// --- دالة لإنشاء توكن JWT ---
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// --- POST /api/auth/register مع Rate Limiting ---
router.post('/register', registerLimiter, registerRules, async (req, res) => {
    const { username, email, password, profileImage } = req.body;

    try {
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ 
                message: userExists.email === email ? 
                    'البريد الإلكتروني مسجل مسبقاً' : 
                    'اسم المستخدم مسجل مسبقاً'
            });
        }

        let profileImageUrl = null;

        // 🆕 معالجة الصورة إذا وجدت
        if (profileImage && profileImage.startsWith('data:image')) {
            console.log('🖼️ جاري معالجة صورة المستخدم...');
            const uploadResult = await UploadService.uploadImage(profileImage);
            
            if (uploadResult.success) {
                profileImageUrl = uploadResult.url;
                console.log('✅ تم رفع الصورة بنجاح:', profileImageUrl);
            } else {
                console.log('⚠️ فشل رفع الصورة، سيتم إنشاء الحساب بدون صورة');
                // نستمر في إنشاء الحساب بدون صورة
            }
        } else if (profileImage) {
            // إذا كانت صورة ليست base64 (رابط مباشر)
            profileImageUrl = profileImage;
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const user = await User.create({
            username,
            email,
            password,
            profileImage: profileImageUrl, // 🆕 تخزين رابط Cloudinary فقط
            emailVerificationToken: verificationCode,
            emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
            emailVerified: false
        });

        // 🆕 إرسال إيميل تفعيل الحساب
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

// --- POST /api/auth/login مع Rate Limiting ---
// استبدل هذا المسار بالكامل
router.post('/login', /* loginLimiter, */ loginRules, async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            createLog('WARN', 'LOGIN_FAILURE', `Failed login for non-existent user: ${email}`, { ip: req.ip });
            return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
        }

        const isPasswordCorrect = await user.matchPassword(password);

        if (!isPasswordCorrect) {
            console.warn(`SECURITY: Failed login attempt (wrong password) for user: ${user.username} (ID: ${user._id}) from IP: ${req.ip}`);
            return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
        }

        // 🎯 التحقق من تفعيل الايميل
        if (!user.emailVerified) {
            createLog('WARN', 'LOGIN_FAILURE', `Wrong password for user: ${user.username}`, { userId: user._id, ip: req.ip });
            return res.status(401).json({
                message: 'يرجى تفعيل بريدك الإلكتروني أولاً. تحقق من بريدك الوارد.'
            });
        }

        // 🎯 تسجيل دخول ناجح — بالمكان الصحيح 100%
        createLog('INFO', 'LOGIN_SUCCESS', `User logged in successfully: ${user.username}`, { userId: user._id, ip: req.ip });
        
        // 🎯 إرسال بيانات المستخدم
        return res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage,
            balance: user.balance,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
        });

    } catch (error) {
        console.error("SECURITY: Login handler exception:", error);
        return res.status(500).json({ message: 'حدث خطأ غير متوقع.' });
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
            profileImage: user.profileImage,
            balance: user.balance,
            isAdmin: user.isAdmin
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// --- POST /api/auth/send-verification مع Rate Limiting ---
router.post('/send-verification', emailVerificationLimiter, async (req, res) => {
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

// --- POST /api/auth/verify-email مع Rate Limiting ---
router.post('/verify-email', emailVerificationLimiter, async (req, res) => {
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

// --- POST /api/auth/forgot-password مع Rate Limiting ---
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
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

// --- POST /api/auth/reset-password مع Rate Limiting ---
// --- POST /api/auth/reset-password مع Rate Limiting ---
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
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

        // 🎯 التحقق مما إذا كانت كلمة المرور الجديدة مطابقة للقديمة
        // سنستخدم bcrypt.compare هنا لأننا لا نريد تشغيل منطق قفل الحساب
        const isSamePassword = await require('bcryptjs').compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة' });
        }

        // تحديث كلمة المرور مباشرة
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        // سيتم تشفير كلمة المرور الجديدة تلقائياً بفضل userSchema.pre('save', ...)
        await user.save();

        res.json({ message: 'تم إعادة تعيين كلمة المرور بنجاح' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'فشل إعادة تعيين كلمة المرور' });
    }
});


module.exports = router;
