const User = require('../models/User');

// @desc    عرض صفحة التسجيل
// @route   GET /auth/register
exports.getRegisterPage = (req, res) => {
    res.render('register', { pageTitle: 'إنشاء حساب' });
};

// @desc    معالجة طلب إنشاء حساب جديد
// @route   POST /auth/register
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // التحقق مما إذا كان المستخدم موجوداً بالفعل
        const userExists = await User.findOne({ email });

        if (userExists) {
            // لاحقاً سنرسل رسالة خطأ جميلة للمستخدم
            return res.status(400).send('هذا البريد الإلكتروني مستخدم بالفعل');
        }

        // إنشاء مستخدم جديد في قاعدة البيانات
        const user = await User.create({
            name,
            email,
            password, // سيتم تشفير كلمة المرور تلقائياً بفضل الكود الذي أضفناه في User.js
        });

        if (user) {
            // في المستقبل، سنسجل دخوله مباشرة ونوجهه لصفحة البروفايل
            // حالياً، سنوجهه لصفحة تسجيل الدخول
            res.redirect('/auth/login'); // سننشئ هذه الصفحة لاحقاً
        } else {
            res.status(400).send('بيانات المستخدم غير صالحة');
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('حدث خطأ في الخادم');
    }
};

// @desc    عرض صفحة تسجيل الدخول
// @route   GET /auth/login
exports.getLoginPage = (req, res) => {
    // سننشئ صفحة login.ejs قريباً
    res.send('<h1>صفحة تسجيل الدخول (سيتم بناؤها قريباً)</h1>');
};
