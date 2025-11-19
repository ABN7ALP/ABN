const mongoose = require('mongoose');
const User = mongoose.model('User');

exports.isAdmin = async (req, res, next) => {
    // أولاً، تأكد من أن المستخدم مسجل دخوله
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        // جلب المستخدم من قاعدة البيانات للتأكد من دوره
        const user = await User.findById(req.session.user.id);

        if (user && user.role === 'admin') {
            // إذا كان المستخدم مشرفاً، اسمح له بالمرور
            next();
        } else {
            // إذا لم يكن مشرفاً، أرسل له خطأ "غير مصرح له"
            res.status(403).send('<h1>403 - الوصول مرفوض</h1><p>ليس لديك الصلاحية للوصول إلى هذه الصفحة.</p>');
        }
    } catch (error) {
        res.status(500).send('حدث خطأ في الخادم');
    }
};
