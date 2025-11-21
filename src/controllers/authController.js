const mongoose = require('mongoose');
const User = mongoose.model('User');

const authController = {};

// @desc    عرض صفحة إنشاء حساب
authController.getRegisterPage = (req, res) => {
    res.render('register', { pageTitle: 'إنشاء حساب', errors: [], error_msg: null, name: '', email: '' });
};

// @desc    تسجيل مستخدم جديد
authController.registerUser = async (req, res) => {
    const { name, email, password, password2 } = req.body;
    let errors = [];

    if (!name || !email || !password || !password2) {
        errors.push({ msg: 'الرجاء ملء جميع الحقول' });
    }
    if (password !== password2) {
        errors.push({ msg: 'كلمتا المرور غير متطابقتين' });
    }
    if (password.length < 6) {
        errors.push({ msg: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' });
    }
    if (errors.length > 0) {
        return res.render('register', { errors, name, email });
    }

    try {
        let user = await User.findOne({ email: email });
        if (user) {
            errors.push({ msg: 'هذا البريد الإلكتروني مسجل بالفعل' });
            return res.render('register', { errors, name, email });
        }
        
        const newUser = new User({ name, email, password });
        await newUser.save();
        
        req.session.user = { id: newUser._id, name: newUser.name, role: newUser.role, balance: newUser.balance, profileImage: newUser.profileImage };
        res.redirect('/dashboard');

    } catch (error) {
        console.error("!!! خطأ فادح أثناء إنشاء الحساب:", error);
        res.render('register', { errors: [{ msg: 'حدث خطأ غير متوقع في الخادم' }], name, email });
    }
};

// ... (بقية الدوال تبقى كما هي تماماً) ...

authController.getLoginPage = (req, res) => {
    res.render('login', { pageTitle: 'تسجيل الدخول', error_msg: null });
};

authController.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.render('login', { error_msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.render('login', { error_msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        req.session.user = { id: user._id, name: user.name, role: user.role, balance: user.balance, profileImage: user.profileImage };
        if (user.role === 'admin') {
            return res.redirect('/admin');
        }
        res.redirect('/dashboard');
    } catch (error) {
        console.error("خطأ في تسجيل الدخول:", error);
        res.render('login', { error_msg: 'حدث خطأ ما في الخادم' });
    }
};

authController.logoutUser = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/auth/login');
    });
};

module.exports = authController;
