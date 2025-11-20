const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = mongoose.model('User');

const authController = {};

// ... (getRegisterPage, registerUser, getLoginPage - بدون تغيير) ...
authController.getRegisterPage = (req, res) => {
    res.render('register', { pageTitle: 'إنشاء حساب', error_msg: null, success_msg: null });
};
authController.registerUser = async (req, res) => {
    const { name, email, password, password2 } = req.body;
    if (password !== password2) {
        return res.render('register', { error_msg: 'كلمتا المرور غير متطابقتين', name, email });
    }
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.render('register', { error_msg: 'البريد الإلكتروني مسجل بالفعل', name, email });
        }
        user = new User({ name, email, password }); // سيتم التشفير بواسطة الـ pre-save hook
        await user.save();
        
        req.session.user = { id: user._id, name: user.name, role: user.role, balance: user.balance };
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.render('register', { error_msg: 'حدث خطأ ما، يرجى المحاولة مرة أخرى', name, email });
    }
};
authController.getLoginPage = (req, res) => {
    res.render('login', { pageTitle: 'تسجيل الدخول', error_msg: null });
};


// @desc    تسجيل دخول المستخدم
authController.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('login', { error_msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // استخدام الدالة التي أنشأناها في النموذج للمقارنة
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.render('login', { error_msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        
        req.session.user = { id: user._id, name: user.name, role: user.role, balance: user.balance };
        
        if (user.role === 'admin') {
            return res.redirect('/admin');
        }
        
        // =================== الإصلاح الحاسم هنا ===================
        // إضافة توجيه صريح للمستخدم العادي
        res.redirect('/dashboard');
        // ==========================================================

    } catch (error) {
        console.error(error);
        res.render('login', { error_msg: 'حدث خطأ ما في الخادم' });
    }
};

// @desc    تسجيل خروج المستخدم
authController.logoutUser = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Session destruction error:", err);
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/auth/login');
    });
};

module.exports = authController;
