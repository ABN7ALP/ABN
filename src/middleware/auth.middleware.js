const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); // تأكد من أن المسار صحيح

const authMiddleware = async (req, res, next) => {
    let token;

    // تحقق مما إذا كان التوكن موجوداً في الهيدر
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // استخراج التوكن من الهيدر (Bearer [token])
            token = req.headers.authorization.split(' ')[1];

            // التحقق من صحة التوكن وفك تشفيره
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // جلب بيانات المستخدم من قاعدة البيانات بناءً على الـ ID الموجود في التوكن
            // مع استثناء كلمة المرور
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next(); // إذا كان كل شيء صحيحاً، انتقل إلى الخطوة التالية (الدالة في المسار)
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = authMiddleware;
