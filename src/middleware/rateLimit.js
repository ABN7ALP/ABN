const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

// إنشاء اتصال Redis (استخدم متغير البيئة الخاص بك)
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redisClient.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
});

redisClient.on('connect', () => {
    console.log('✅ Connected to Redis for rate limiting');
});

// ⏱️ Rate Limiting لتسجيل الدخول (مع Redis)
const loginLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:login:',
        expiry: 15 * 60 // 15 دقيقة
    }),
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 محاولات كل 15 دقيقة
    message: {
        success: false,
        message: 'تم تجاوز عدد محاولات الدخول. يرجى المحاولة بعد 15 دقيقة.',
        code: 'LOGIN_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
        return req.body.email ? `email:${req.body.email}` : `ip:${req.ip}`;
    },
    handler: (req, res, next, options) => {
        console.log(`🚨 Login rate limit exceeded: IP=${req.ip}, Email=${req.body.email}`);
        res.status(429).json(options.message);
    }
});

// ⏱️ Rate Limiting للتسجيل
const registerLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:register:',
        expiry: 60 * 60 // ساعة
    }),
    windowMs: 60 * 60 * 1000,
    max: 3, // 3 حسابات كل ساعة
    message: {
        success: false,
        message: 'تم تجاوز عدد محاولات التسجيل المسموحة. يرجى المحاولة بعد ساعة.',
        code: 'REGISTER_LIMIT_EXCEEDED'
    },
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `ip:${req.ip}`,
    handler: (req, res, next, options) => {
        console.log(`🚨 Registration rate limit exceeded: IP=${req.ip}`);
        res.status(429).json(options.message);
    }
});

// ⏱️ Rate Limiting لاستعادة كلمة المرور
const passwordResetLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:reset:',
        expiry: 15 * 60
    }),
    windowMs: 15 * 60 * 1000,
    max: 3, // 3 محاولات كل 15 دقيقة
    message: {
        success: false,
        message: 'تم تجاوز عدد محاولات استعادة كلمة المرور. يرجى المحاولة بعد 15 دقيقة.',
        code: 'RESET_LIMIT_EXCEEDED'
    },
    keyGenerator: (req) => req.body.email ? `email:${req.body.email}` : `ip:${req.ip}`,
    handler: (req, res, next, options) => {
        console.log(`🚨 Password reset limit exceeded: IP=${req.ip}, Email=${req.body.email}`);
        res.status(429).json(options.message);
    }
});

// ⏱️ Rate Limiting للتحقق من البريد الإلكتروني
const emailVerificationLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:verify:',
        expiry: 5 * 60
    }),
    windowMs: 5 * 60 * 1000,
    max: 5, // 5 محاولات كل 5 دقائق
    message: {
        success: false,
        message: 'تم تجاوز عدد محاولات التحقق. يرجى المحاولة بعد 5 دقائق.',
        code: 'VERIFY_LIMIT_EXCEEDED'
    },
    keyGenerator: (req) => req.body.email ? `email:${req.body.email}` : `ip:${req.ip}`
});

// ⏱️ Rate Limiting عام لجميع طلبات الـ API
const generalLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:general:',
        expiry: 15 * 60
    }),
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 طلب كل 15 دقيقة
    message: {
        success: false,
        message: 'تم تجاوز عدد الطلبات المسموحة. يرجى المحاولة لاحقاً.',
        code: 'GENERAL_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // تخطي إذا كان المستخدم مدير
        return req.user && req.user.isAdmin === true;
    }
});

// ⏱️ Rate Limiting خاص بالمدير
const adminLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:admin:',
        expiry: 15 * 60
    }),
    windowMs: 15 * 60 * 1000,
    max: 500, // 500 طلب للمدير
    message: {
        success: false,
        message: 'تم تجاوز عدد الطلبات المسموحة للمدير.',
        code: 'ADMIN_LIMIT_EXCEEDED'
    },
    skip: (req) => {
        // تخطي إذا لم يكن مدير
        return !req.user || req.user.isAdmin !== true;
    }
});

// ⏱️ Rate Limiting لطلب الإيداع
const depositLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:deposit:',
        expiry: 15 * 60
    }),
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 طلبات إيداع كل 15 دقيقة
    message: {
        success: false,
        message: 'تم تجاوز عدد طلبات الإيداع المسموحة. يرجى المحاولة بعد 15 دقيقة.',
        code: 'DEPOSIT_LIMIT_EXCEEDED'
    },
    keyGenerator: (req) => {
        return req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
    }
});

// ⏱️ Rate Limiting لإنشاء الطلبات
const orderLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:order:',
        expiry: 5 * 60
    }),
    windowMs: 5 * 60 * 1000,
    max: 20, // 20 طلب كل 5 دقائق
    message: {
        success: false,
        message: 'تم تجاوز عدد الطلبات المسموحة. يرجى الإبطاء قليلاً.',
        code: 'ORDER_LIMIT_EXCEEDED'
    },
    keyGenerator: (req) => {
        return req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
    }
});

module.exports = {
    loginLimiter,
    registerLimiter,
    passwordResetLimiter,
    emailVerificationLimiter,
    generalLimiter,
    adminLimiter,
    depositLimiter,
    orderLimiter
};
