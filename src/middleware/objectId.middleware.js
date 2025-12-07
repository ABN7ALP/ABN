const mongoose = require('mongoose');

/**
 * Middleware للتحقق مما إذا كان معرف (ID) معين في بارامترات الرابط هو ObjectId صالح.
 * @param {string} idParam - اسم البارامتر في الرابط الذي يحتوي على الـ ID (مثال: 'id').
 */
const validateObjectId = (idParam) => {
    return (req, res, next) => {
        const id = req.params[idParam];

        // التحقق من وجود الـ ID ومن أنه ObjectId صالح
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            console.warn(`Invalid ObjectId received: ${id} for param: ${idParam}`);
            // إذا لم يكن صالحاً، أرجع خطأ 400 فوراً
            return res.status(400).json({ message: `المعرف (ID) المقدم غير صالح.` });
        }

        // إذا كان صالحاً، انتقل إلى الـ Middleware أو المسار التالي
        next();
    };
};

module.exports = validateObjectId;
