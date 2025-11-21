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

    // مصفوفة لتجميع الأخطاء
    let errors = [];

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
        // تحقق مما إذا كان المستخدم موجوداً بالفعل
        let user = await User.findOne({ email: email });
        if (user) {
            // إذا كان موجوداً، أرسل رسالة خطأ واضحة
            return res.render('register', { error_msg: 'هذا البريد الإلكتروني مسجل بالفعل. يرجى استخدام بريد آخر أو تسجيل الدخول.', name, email });
        }
        
        // إذا لم يكن موجوداً، قم بإنشاء مستخدم جديد
        const newUser = new User({ name, email, password });
        await newUser.save();
        
        // إنشاء الجلسة مباشرة بعد التسجيل الناجح
        req.session.user = { id: newUser._id, name: newUser.name, role: newUser.role, balance: newUser.balance, profileImage: newUser.profileImage };
        res.redirect('/dashboard');

    } catch (error) {
        // ======================= الإصلاح الحاسم هنا =======================
        // طباعة الخطأ الفعلي في الكونسول للتشخيص
        console.error("!!! خطأ فادح أثناء إنشاء الحساب:", error);
        // =================================================================
        res.render('register', { error_msg: 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة مرة أخرى.', name, email });
    }
};

// ... (بقية الدوال: getLoginPage, loginUser, logoutUser تبقى كما هي بدون تغيير) ...

// @desc    عرض صفحة تسجيل الدخول
authController.getLoginPage = (req, res) => {
    res.render('login', { pageTitle: 'تسجيل الدخول', error_msg: null });
};

// @desc    تسجيل دخول المستخدم
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
