const mongoose = require('mongoose'); // <-- استدعاء mongoose
const User = mongoose.model('User');   // <-- استخدام mongoose.model
const bcrypt = require('bcryptjs');

// ... باقي دوال الـ controller كما هي بدون تغيير ...
// (getRegisterPage, registerUser, getLoginPage, loginUser, logoutUser)
// فقط تأكد من أن استدعاء User و bcrypt في الأعلى كما هو موضح هنا.

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
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).send('هذا البريد الإلكتروني مستخدم بالفعل');
        }
        const user = await User.create({ name, email, password });
        if (user) {
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
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }
        req.session.user = { id: user._id, name: user.name, role: user.role };
        res.redirect('/dashboard');
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
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/auth/login');
    });
};
