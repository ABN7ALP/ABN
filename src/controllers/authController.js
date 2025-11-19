const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = mongoose.model('User');

const authController = {}; // كائن جديد لتجميع الدوال

// @desc    عرض صفحة التسجيل
authController.getRegisterPage = (req, res) => {
    res.render('register', { pageTitle: 'إنشاء حساب' });
};

// @desc    إنشاء مستخدم جديد
authController.registerUser = async (req, res) => {
    const { name, email, password, password2 } = req.body;
    // ... (باقي منطق الدالة بدون تغيير)
    if (password !== password2) {
        return res.render('register', { error_msg: 'كلمتا المرور غير متطابقتين' });
    }
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.render('register', { error_msg: 'البريد الإلكتروني مسجل بالفعل' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = await User.create({ name, email, password: hashedPassword });
        req.session.user = { id: user._id, name: user.name, role: user.role };
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.render('register', { error_msg: 'حدث خطأ ما، يرجى المحاولة مرة أخرى' });
    }
};

// @desc    عرض صفحة تسجيل الدخول
authController.getLoginPage = (req, res) => {
    res.render('login', { pageTitle: 'تسجيل الدخول' });
};

// @desc    تسجيل دخول المستخدم
authController.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('login', { error_msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { error_msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        req.session.user = { id: user._id, name: user.name, role: user.role, balance: user.balance };
        if (user.role === 'admin') {
            return res.redirect('/admin');
        }
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.render('login', { error_msg: 'حدث خطأ ما' });
    }
};

// @desc    تسجيل خروج المستخدم
authController.logoutUser = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/auth/login');
    });
};

module.exports = authController; // تصدير الكائن بالكامل
