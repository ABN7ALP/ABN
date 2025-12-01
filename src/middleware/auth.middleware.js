const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); 

const authMiddleware = async (req, res, next) => {
    let token;

    // 1. التحقق من وجود التوكن في الهيدر
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // 2. أو من الكوكيز (لـ CSRF)
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    // 3. تحديد المسارات العامة التي لا تحتاج مصادقة
    const publicPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/forgot-password',
        '/api/auth/reset-password',
        '/api/auth/verify-email',
        '/api/auth/send-verification',
        '/api/services',
        '/api/offers/active',
        '/api/orders/calculate-price',
        '/api/health',
        '/'
    ];

    const isPublicPath = publicPaths.some(path => 
        req.path === path || req.path.startsWith(path + '/')
    );

    // 4. إذا كان المسار عاماً ولا يوجد توكن، انتقل مباشرة
    if (isPublicPath && !token) {
        return next();
    }

    // 5. إذا لم يكن هناك توكن وليس مسار عام
    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: 'غير مصرح، يرجى تسجيل الدخول',
            code: 'NO_TOKEN'
        }); 
    }

    // 6. التحقق من صحة التوكن وجلب بيانات المستخدم
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        // إذا لم يتم العثور على المستخدم
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                message: 'المستخدم غير موجود',
                code: 'USER_NOT_FOUND' 
            });
        }

        // التحقق إذا كان الحساب مقفول
        if (req.user.isLocked) {
            return res.status(423).json({ 
                success: false,
                message: 'الحساب مقفول مؤقتاً بسبب كثرة المحاولات الفاشلة',
                code: 'ACCOUNT_LOCKED'
            });
        }

        // 7. تحديد مسارات المدير
        const adminRoutes = [
            '/api/stats', 
            '/api/orders',
            '/api/admin',
            '/api/offers',
            '/api/queue'
        ];
        
        const isAdminRoute = adminRoutes.some(route => 
            req.path.startsWith(route) || req.originalUrl.startsWith(route)
        );

        if (isAdminRoute) {
            if (req.user.isAdmin !== true) {
                console.log(`🚨 ACCESS DENIED: User ${req.user.username} (ID: ${req.user._id}) tried to access: ${req.path}`);
                return res.status(403).json({ 
                    success: false,
                    message: 'غير مصرح: يتطلب صلاحيات المدير.',
                    code: 'ADMIN_REQUIRED'
                });
            }
        }
        
        // 8. تحديث آخر نشاط للمستخدم
        req.user.lastActivity = new Date();
        await req.user.save();
        
        next();

    } catch (error) {
        console.error('JWT Error:', error.message);
        
        // تحسين رسائل الخطأ
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: 'توكن غير صالح',
                code: 'INVALID_TOKEN'
            });
        }
        
        return res.status(401).json({ 
            success: false,
            message: 'خطأ في المصادقة',
            code: 'AUTH_ERROR'
        });
    }
};

module.exports = authMiddleware;
