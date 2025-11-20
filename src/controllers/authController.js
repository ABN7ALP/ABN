const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = mongoose.model('User');

const authController = {}; // كائن لتجميع الدوال

// @desc    عرض صفحة التسجيل
authController.getRegisterPage = (req, res) => {
    // هذه الدالة لا تحتاج تعديل
    res.render('register', { pageTitle: 'إنشاء حساب', error_msg: null, success_msg: null });
};

// @desc    إنشاء مستخدم جديد
authController.registerUser = async (req, res) => {
    // هذه الدالة لا تحتاج تعديل
    const { name, email, password, password2 } = req.body;
    if (password !== password2) {
        return res.render('register', { error_msg: 'كلمتا المرور غير متطابقتين', name, email });
    }
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.render('register', { error_msg: 'البريد الإلكتروني مسجل بالفعل', name, email });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = await User.create({ name, email, password: hashedPassword });
        
        // إنشاء الجلسة مباشرة بعد التسجيل
        req.session.user = { id: user._id, name: user.name, role: user.role, balance: user.balance };
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.render('register', { error_msg: 'حدث خطأ ما، يرجى المحاولة مرة أخرى', name, email });
    }
};

// @desc    عرض صفحة تسجيل الدخول
authController.getLoginPage = (req, res) => {
    // هذه الدالة لا تحتاج تعديل
    res.render('login', { pageTitle: 'تسجيل الدخول', error_msg: null });
};

// @desc    تسجيل دخول المستخدم
authController.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        // =================== الإصلاح الحاسم هنا ===================
        // يجب أن نجلب المستخدم مع كلمة المرور الخاصة به للمقارنة
        // لذلك، قمنا بإزالة .select('-password') من هنا
        const user = await User.findOne({ email });
        // ==========================================================

        if (!user) {
            return res.render('login', { error_msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // الآن user.password لن تكون undefined
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { error_msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        
        // إنشاء الجلسة بالبيانات الصحيحة
        req.session.user = { id: user._id, name: user.name, role: user.role, balance: user.balance };
        
        // توجيه المشرف إلى لوحة التحكم الخاصة به
        if (user.role === 'admin') {
            return res.redirect('/admin');
        }
        
        // توجيه المستخدم العادي إلى لوحة التحكم
        res.redirect('/dashboard');

    } catch (error) {
        console.error(error);
        res.render('login', { error_msg: 'حدث خطأ ما في الخادم' });
    }
};

// @desc    تسجيل خروج المستخدم
authController.logoutUser = (req, res) => {
    // هذه الدالة لا تحتاج تعديل
    req.session.destroy(err => {
        if (err) {
            console.error("Session destruction error:", err);
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/auth/login');
    });
};

module.exports = authController; // تصدير الكائن بالكامل
