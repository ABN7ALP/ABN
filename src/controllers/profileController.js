const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = mongoose.model('User');

const profileController = {};

// @desc    عرض صفحة الملف الشخصي
// @route   GET /profile
profileController.getProfilePage = async (req, res) => {
    try {
        // جلب أحدث بيانات المستخدم من قاعدة البيانات
        const user = await User.findById(req.session.user.id);
        
        res.render('profile', {
            pageTitle: 'الملف الشخصي',
            user: user, // إرسال كائن المستخدم الكامل إلى الصفحة
            success_msg: req.query.success,
            error_msg: req.query.error
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.redirect('/dashboard');
    }
};

// @desc    تغيير كلمة المرور
// @route   POST /profile/change-password
profileController.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        const userId = req.session.user.id;

        // التحقق من تطابق كلمات المرور الجديدة
        if (newPassword !== confirmNewPassword) {
            return res.redirect('/profile?error=كلمتا المرور الجديدتان غير متطابقتين');
        }

        const user = await User.findById(userId);

        // التحقق من صحة كلمة المرور الحالية
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.redirect('/profile?error=كلمة المرور الحالية غير صحيحة');
        }

        // تشفير كلمة المرور الجديدة وحفظها
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.redirect('/profile?success=تم تغيير كلمة المرور بنجاح');

    } catch (error) {
        console.error('Error changing password:', error);
        res.redirect('/profile?error=حدث خطأ أثناء تغيير كلمة المرور');
    }
};

module.exports = profileController;
