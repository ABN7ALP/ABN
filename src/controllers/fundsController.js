const mongoose = require('mongoose');
const User = mongoose.model('User');

// @desc    عرض صفحة شحن الرصيد
// @route   GET /add-funds
exports.getAddFundsPage = async (req, res) => {
    try {
        // نحتاج فقط لبيانات المستخدم الحالي لعرضها في الشريط العلوي
        const currentUser = await User.findById(req.session.user.id);

        res.render('add-funds', {
            user: currentUser,
        });
    } catch (error) {
        console.error('خطأ في عرض صفحة شحن الرصيد:', error);
        res.status(500).send('حدث خطأ في الخادم');
    }
};
