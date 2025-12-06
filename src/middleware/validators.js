const { body, param, validationResult } = require('express-validator');

// دالة وسيطة لمعالجة أخطاء التحقق
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // إرجاع أول خطأ فقط لتبسيط رسائل الواجهة الأمامية
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
};

// --- قواعد التحقق للمصادقة (Auth) ---
const registerRules = [
    body('username')
        .trim()
        .isLength({ min: 3 }).withMessage('اسم المستخدم يجب أن يكون 3 أحرف على الأقل.')
        .isAlphanumeric().withMessage('اسم المستخدم يجب أن يحتوي على أحرف وأرقام فقط.'),
    body('email')
        .isEmail().withMessage('الرجاء إدخال بريد إلكتروني صالح.')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل.')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير، حرف صغير، رقم، ورمز خاص.'),
    handleValidationErrors
];


const loginRules = [
    body('email')
        .isEmail().withMessage('الرجاء إدخال بريد إلكتروني صالح.')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('كلمة المرور مطلوبة.'), // ✅ هذا هو التحقق الصحيح لتسجيل الدخول
    handleValidationErrors
];

// --- قواعد التحقق للطلبات (Orders) ---
const createOrderRules = [
    body('platform').trim().notEmpty().withMessage('المنصة مطلوبة.'),
    body('service').trim().notEmpty().withMessage('الخدمة مطلوبة.'),
    body('link').isURL().withMessage('الرابط يجب أن يكون URL صالح.'),
    body('quantity').isInt({ min: 1 }).withMessage('الكمية يجب أن تكون رقماً صحيحاً أكبر من صفر.'),
    body('price').isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقماً صالحاً.'),
    handleValidationErrors
];

// --- قواعد التحقق للخدمات (Services) ---
const serviceRules = [
    body('platform').trim().notEmpty().withMessage('المنصة مطلوبة.'),
    body('name').trim().notEmpty().withMessage('اسم الخدمة مطلوب.'),
    body('pricePer1000').isFloat({ min: 0.01 }).withMessage('السعر يجب أن يكون أكبر من صفر.'),
    body('min').isInt({ min: 1 }).withMessage('الحد الأدنى يجب أن يكون 1 على الأقل.'),
    body('max').isInt({ min: 1 }).withMessage('الحد الأقصى يجب أن يكون 1 على الأقل.'),
    body('step').isInt({ min: 1 }).withMessage('الخطوة يجب أن تكون 1 على الأقل.'),
    handleValidationErrors
];

// --- قواعد التحقق لطلبات الشحن (Deposits) ---
const depositRules = [
    body('amount').isFloat({ min: 1 }).withMessage('المبلغ يجب أن يكون 1 دولار على الأقل.'),
    body('method').isIn(['bank', 'sham', 'whatsapp', 'payeer', 'binance-pay', 'usdt', 'trx', 'bnb']).withMessage('طريقة الدفع غير صالحة.'),
    body('depositorName').trim().notEmpty().withMessage('اسم المودع مطلوب.'),
    body('receiptImage').notEmpty().withMessage('صورة الإيصال مطلوبة.'),
    handleValidationErrors
];

module.exports = {
    registerRules,
    loginRules,
    createOrderRules,
    serviceRules,
    depositRules
};
