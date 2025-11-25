const adminMiddleware = (req, res, next) => {
    // هذا الشرط يعتمد على أن authMiddleware قد قام بالفعل بتحميل بيانات المستخدم في req.user
    if (req.user && req.user.isAdmin) {
        next(); // المستخدم أدمن، السماح له بالمرور
    } else {
        // إذا لم يكن لديه صلاحيات، نرفض الطلب
        res.status(403).json({ message: 'غير مصرح لك. يجب أن تكون مديراً (Admin).' });
    }
};

module.exports = adminMiddleware;
