const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = mongoose.model('User');
const upload = require('../middleware/uploadMiddleware'); // <-- استيراد وسيط الرفع

const profileController = {};

// @desc    عرض صفحة الملف الشخصي
profileController.getProfilePage = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('profile', {
            pageTitle: 'الملف الشخصي',
            user: user,
            success_msg: req.query.success,
            error_msg: req.query.error
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.redirect('/dashboard');
    }
};

// @desc    تغيير كلمة المرور
profileController.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        const userId = req.session.user.id;

        if (newPassword !== confirmNewPassword) {
            return res.redirect('/profile?error=كلمتا المرور الجديدتان غير متطابقتين');
        }

        const user = await User.findById(userId).select('+password'); // <-- جلب كلمة المرور للمقارنة
        if (!user) {
            return res.redirect('/auth/login');
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.redirect('/profile?error=كلمة المرور الحالية غير صحيحة');
        }

        user.password = newPassword; // سيتم التشفير تلقائياً بواسطة userSchema.pre('save')
        await user.save();

        res.redirect('/profile?success=تم تغيير كلمة المرور بنجاح');

    } catch (error) {
        console.error('Error changing password:', error);
        res.redirect('/profile?error=حدث خطأ أثناء تغيير كلمة المرور');
    }
};

// @desc    رفع صورة شخصية جديدة
// @route   POST /profile/upload-image
profileController.uploadImage = async (req, res) => {
    // نستخدم وسيط الرفع هنا
    upload(req, res, async (err) => {
        if (err) {
            // إذا حدث خطأ أثناء الرفع (مثل نوع ملف خاطئ أو حجم كبير)
            return res.redirect(`/profile?error=${err}`);
        }
        
        if (req.file == undefined) {
            // إذا لم يتم اختيار ملف
            return res.redirect('/profile?error=الرجاء اختيار ملف صورة');
        }

        try {
            // تحديث اسم الصورة في قاعدة البيانات
            await User.findByIdAndUpdate(req.session.user.id, {
                profileImage: req.file.filename
            });
            res.redirect('/profile?success=تم تحديث الصورة الشخصية بنجاح');
        } catch (dbError) {
            console.error('Database error after upload:', dbError);
            res.redirect('/profile?error=حدث خطأ أثناء حفظ الصورة');
        }
    });
};

module.exports = profileController;
