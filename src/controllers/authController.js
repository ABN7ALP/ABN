const mongoose = require('mongoose');
const User = mongoose.model('User');
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

        // =================== الإصلاح الحاسم هنا ===================
        // أضفنا .select('+password') لطلب حقل كلمة المرور بشكل صريح
        const user = await User.findOne({ email }).select('+password');
        // ==========================================================

        // إذا لم يتم العثور على المستخدم، أو إذا لم يتم إرجاع كلمة مرور لسبب ما
        if (!user || !user.password) {
            return res.status(401).send('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }

        // الآن user.password مضمونة أنها موجودة
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).send('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }

        // إنشاء الجلسة
        req.session.user = { id: user._id, name: user.name, role: user.role };
        
        // توجيه المستخدم بناءً على دوره
        if (user.role === 'admin') {
            res.redirect('/admin');
        } else {
            res.redirect('/dashboard');
        }

    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
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
