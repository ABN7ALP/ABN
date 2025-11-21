// هذا هو الكود الصحيح الذي يجب أن يكون في الملف

const protect = (req, res, next) => {
    // إذا لم يكن المستخدم مسجلاً دخوله، قم بإعادة توجيهه إلى صفحة تسجيل الدخول.
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    // إذا كان مسجلاً دخوله، اسمح له بالمرور.
    next();
};

const isAdmin = (req, res, next) => {
    // تأكد أولاً أنه مسجل دخوله
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    // ثم تأكد من أنه "admin"
    if (req.session.user.role !== 'admin') {
        return res.status(403).send('غير مصرح لك بالوصول إلى هذه الصفحة');
    }
    next();
};

// نقوم بتصدير `protect` و `isAdmin`
module.exports = { protect, isAdmin };
