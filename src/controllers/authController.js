const User = require('../models/User');
const bcrypt = require('bcryptjs');

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
            return res.status(400).send('هذا البريد الإلكتروني مستخدم بالفعل');
        }

        // إنشاء مستخدم جديد في قاعدة البيانات
        const user = await User.create({
            name,
            email,
            password,
        });

        if (user) {
            // توجيهه لصفحة تسجيل الدخول بعد النجاح
            res.redirect('/auth/login');
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
    res.render('login', { pageTitle: 'تسجيل الدخول' });
};

// @desc    معالجة طلب تسجيل الدخول
// @route   POST /auth/login
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. البحث عن المستخدم في قاعدة البيانات
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).send('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }

        // 2. مقارنة كلمة المرور المدخلة مع الكلمة المشفرة
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).send('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }

        // 3. نجاح تسجيل الدخول: حفظ معلومات المستخدم في الجلسة
        req.session.user = {
            id: user._id,
            name: user.name,
            role: user.role
        };
        
        // 4. توجيه المستخدم إلى صفحة الملف الشخصي
        res.redirect('/profile');

    } catch (error) {
        console.error(error);
        res.status(500).send('حدث خطأ في الخادم');
    }
};

// @desc    تسجيل الخروج
// @route   GET /auth/logout
exports.logoutUser = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('خطأ أثناء تدمير الجلسة:', err);
            return res.redirect('/profile');
        }
        res.clearCookie('connect.sid'); // اسم الكوكي الافتراضي للجلسة
        res.redirect('/auth/login');
    });
};
