const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); 

const authMiddleware = async (req, res, next) => {
    let token;

    // 1. التحقق من وجود التوكن في الهيدر
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // 2. إذا لم يكن هناك توكن، قم بإرسال رسالة خطأ مباشرة
    if (!token) {
        // نستخدم return لضمان عدم تنفيذ أي كود آخر بعد إرسال الاستجابة
        return res.status(401).json({ message: 'Not authorized, no token' }); 
    }

    // 3. التحقق من صحة التوكن وجلب بيانات المستخدم
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        // إذا لم يتم العثور على المستخدم في قاعدة البيانات
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, user not found' });
        }
        
        // ------------------------------------------
        // ******** حماية مسارات المدير (منطقك الجديد) ********
        // ------------------------------------------

        const adminRoutes = [
            '/api/stats', 
            '/api/orders', 
            '/api/services', 
            '/api/deposits'
        ];
        
        const isAdminRoute = adminRoutes.some(route => req.originalUrl.startsWith(route));

        if (isAdminRoute) {
            // إذا كان المسار يتطلب صلاحية المدير والمستخدم ليس مديراً
            if (req.user.isAdmin !== true) {
                console.log(`ACCESS DENIED: User ${req.user.username} (ID: ${req.user._id}) tried to access Admin route: ${req.originalUrl}`);
                return res.status(403).json({ message: 'غير مصرح لك: يتطلب صلاحيات المدير.' });
            }
        }
        
        // ------------------------------------------
        
        // 4. إذا مر كل شيء بنجاح، انتقل إلى المسار التالي
        next(); 

    } catch (error) {
        // في حال فشل التحقق من التوكن (انتهت صلاحيته أو غير صحيح)
        console.error(error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

module.exports = authMiddleware;

