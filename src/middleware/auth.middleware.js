const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); 

const authMiddleware = async (req, res, next) => {
    let token;

    // 1. التحقق من وجود التوكن في الهيدر
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    // 🆕 التحقق من وجود التوكن في query parameters
    if (!token && req.query.token) {
        token = req.query.token;
    }

    // 2. إذا لم يكن هناك توكن
    if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ 
            success: false,
            message: 'غير مصرح، يرجى تسجيل الدخول أولاً.' 
        });
    }
    
    // 🆕 التحقق من أن التوكن ليس تالفاً
    if (token.length < 50) {
        console.log('❌ Invalid token length:', token.length);
        return res.status(401).json({ 
            success: false,
            message: 'التوكن غير صالح.' 
        });
    }

    // 3. التحقق من صحة التوكن وجلب بيانات المستخدم
    try {
        // 🆕 **هذا هو التصحيح المهم!**
        const JWT_SECRET = process.env.JWT_SECRET;
        
        if (!JWT_SECRET) {
            console.error('❌ JWT_SECRET is not defined in environment variables');
            return res.status(500).json({ 
                success: false,
                message: 'خطأ في إعدادات الخادم.' 
            });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (!decoded || !decoded.id) {
            return res.status(401).json({ 
                success: false,
                message: 'التوكن غير صالح.' 
            });
        }
        
        req.user = await User.findById(decoded.id).select('-password');

        // إذا لم يتم العثور على المستخدم
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                message: 'المستخدم غير موجود.' 
            });
        }
        
        // ------------------------------------------
        // ******** حماية مسارات المدير ********
        // ------------------------------------------
        const adminRoutes = [
            '/api/stats', 
            '/api/orders', 
            '/api/services', 
            '/api/deposits',
            '/api/admin'
        ];
        
        const isAdminRoute = adminRoutes.some(route => req.originalUrl.startsWith(route));

        if (isAdminRoute) {
            if (req.user.isAdmin !== true) {
                console.log(`ACCESS DENIED: User ${req.user.username} tried to access Admin route: ${req.originalUrl}`);
                return res.status(403).json({ 
                    success: false,
                    message: 'غير مصرح لك: يتطلب صلاحيات المدير.' 
                });
            }
        }
        
        // 4. انتقل للمسار التالي
        next(); 

    } catch (error) {
        // 🆕 تسجيل الخطأ بالتفصيل
        console.error('🔐 JWT Error:');
        console.error('- Name:', error.name);
        console.error('- Message:', error.message);
        console.error('- Token preview:', token.substring(0, 50) + '...');
        
        let errorMessage = 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.';
        
        if (error.name === 'JsonWebTokenError') {
            errorMessage = 'التوكن غير صالح.';
        } else if (error.name === 'TokenExpiredError') {
            errorMessage = 'انتهت صلاحية التوكن.';
        }
        
        return res.status(401).json({ 
            success: false,
            message: errorMessage
        });
    }
};

module.exports = authMiddleware;
