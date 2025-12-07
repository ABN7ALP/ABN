// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

// ⏱️ Rate Limiting لتسجيل الدخول
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 5, // 5 محاولات كحد أقصى كل 15 دقيقة
    message: {
        success: false,
        message: 'تم تجاوز عدد المحاولات المسموحة. يرجى المحاولة مرة أخرى بعد 15 دقيقة.'
    },
    standardHeaders: true, // إرجاع معلومات Rate Limit في الـ headers
    legacyHeaders: false, // تعطيل الـ headers القديمة
    handler: (req, res, next, options) => {
        // تسجيل محاولة الدخول الفاشلة
        console.log(`🚨 Rate limit exceeded for IP: ${req.ip}, Email: ${req.body.email}`);
        res.status(429).json(options.message);
    }
});

// ⏱️ Rate Limiting للتسجيل
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // ساعة واحدة
    max: 3, // 3 حسابات كحد أقصى كل ساعة من نفس الـ IP
    message: {
        success: false,
        message: 'تم تجاوز عدد محاولات التسجيل المسموحة. يرجى المحاولة مرة أخرى بعد ساعة.'
    },
    handler: (req, res, next, options) => {
        console.log(`🚨 Registration limit exceeded for IP: ${req.ip}`);
        res.status(429).json(options.message);
    }
});

// ⏱️ Rate Limiting لاستعادة كلمة المرور
const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 3, // 3 محاولات استعادة كل 15 دقيقة
    message: {
        success: false,
        message: 'تم تجاوز عدد محاولات استعادة كلمة المرور. يرجى المحاولة مرة أخرى بعد 15 دقيقة.'
    },
    handler: (req, res, next, options) => {
        console.log(`🚨 Password reset limit exceeded for IP: ${req.ip}, Email: ${req.body.email}`);
        res.status(429).json(options.message);
    }
});

// ⏱️ Rate Limiting للتحقق من البريد الإلكتروني
const emailVerificationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 دقائق
    max: 5, // 5 محاولات تحقق كل 5 دقائق
    message: {
        success: false,
        message: 'تم تجاوز عدد محاولات التحقق. يرجى المحاولة مرة أخرى بعد 5 دقائق.'
    }
});

// ⏱️ Rate Limiting عام لجميع طلبات الـ API
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // 100 طلب كحد أقصى كل 15 دقيقة
    message: {
        success: false,
        message: 'تم تجاوز عدد الطلبات المسموحة. يرجى المحاولة مرة أخرى لاحقاً.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// ⏱️ Rate Limiting خاص بالمدير (أكثر مرونة)
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 500, // 500 طلب للمدير كل 15 دقيقة
    message: {
        success: false,
        message: 'تم تجاوز عدد الطلبات المسموحة للمدير.'
    },
    skip: (req) => {
        // تخطي الـ rate limiting إذا كان المستخدم مدير
        return req.user && req.user.isAdmin === true;
    }
});

module.exports = {
    loginLimiter,
    registerLimiter,
    passwordResetLimiter,
    emailVerificationLimiter,
    generalLimiter,
    adminLimiter
};
