const mongoose = require('mongoose');
const User = mongoose.model('User');

const authController = {};

// @desc    عرض صفحة إنشاء حساب
authController.getRegisterPage = (req, res) => {
    res.render('register', { pageTitle: 'إنشاء حساب', error_msg: null, success_msg: null, name: '', email: '' });
};

// @desc    تسجيل مستخدم جديد
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
        user = new User({ name, email, password });
        await user.save();
        
        // إنشاء الجلسة مباشرة بعد التسجيل
        req.session.user = { id: user._id, name: user.name, role: user.role, balance: user.balance, profileImage: user.profileImage };
        res.redirect('/dashboard');

    } catch (error) {
        console.error("خطأ في تسجيل المستخدم:", error);
        // في حالة وجود خطأ في التحقق من الصحة (مثل حقل فارغ)، أرسل رسالة واضحة
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(val => val.message).join(', ');
            return res.render('register', { error_msg: message, name, email });
        }
        res.render('register', { error_msg: 'حدث خطأ ما في الخادم، يرجى المحاولة مرة أخرى', name, email });
    }
};

// @desc    عرض صفحة تسجيل الدخول
authController.getLoginPage = (req, res) => {
    res.render('login', { pageTitle: 'تسجيل الدخول', error_msg: null });
};

// @desc    تسجيل دخول المستخدم
authController.loginUser = async (req, res) => {
    console.log("LOGIN REQUEST BODY:", req.body);

    const { email, password } = req.body;

    try {
        console.log("SEARCHING USER...");
        const user = await User.findOne({ email }).select('+password');

        console.log("FOUND USER:", user ? user.email : "NOT FOUND");

        if (!user) {
            console.log("USER NOT FOUND -> rendering login page");
            return res.render('login', { error_msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        console.log("CHECKING PASSWORD...");
        const isMatch = await user.matchPassword(password);
        
        console.log("PASSWORD MATCH RESULT:", isMatch);

        if (!isMatch) {
            console.log("PASSWORD INCORRECT -> rendering login page");
            return res.render('login', { error_msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        console.log("LOGIN SUCCESS, SETTING SESSION...");

        req.session.user = { 
            id: user._id, 
            name: user.name, 
            role: user.role, 
            balance: user.balance, 
            profileImage: user.profileImage 
        };

        console.log("SESSION BEFORE SAVE:", req.session.user);

        req.session.save(err => {
            console.log("SESSION SAVE CALLBACK, ERROR:", err);

            if (err) {
                return res.render('login', { error_msg: 'فشل إنشاء الجلسة، جرّب لاحقاً' });
            }

            console.log("REDIRECTING USER, ROLE:", user.role);

            if (user.role === 'admin') {
                return res.redirect('/admin');
            }

            return res.redirect('/dashboard');
        });

    } catch (error) {
        console.error("ERROR IN LOGIN:", error);
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
