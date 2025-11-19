const mongoose = require('mongoose');
const FundRequest = mongoose.model('FundRequest');

// @desc    عرض صفحة شحن الرصيد
// @route   GET /add-funds
exports.getFundsPage = (req, res) => {
    res.render('add-funds', { 
        pageTitle: 'شحن الرصيد',
        user: req.session.user,
        success_msg: req.query.success, // لقراءة رسالة النجاح من الرابط
        error_msg: req.query.error,     // لقراءة رسالة الخطأ من الرابط
    });
};

// @desc    إنشاء طلب شحن رصيد جديد
// @route   POST /add-funds/request
exports.createFundRequest = async (req, res) => {
    try {
        const { method, amount, details } = req.body;
        const userId = req.session.user.id;

        if (!method || !amount || !details) {
            // إعادة التوجيه مع رسالة خطأ
            return res.redirect('/add-funds?error=الرجاء ملء جميع الحقول');
        }

        await FundRequest.create({
            user: userId,
            method,
            amount: parseFloat(amount),
            details,
        });

        // إعادة التوجيه مع رسالة نجاح
        res.redirect('/add-funds?success=تم إرسال طلبك بنجاح، ستتم مراجعته قريباً.');

    } catch (error) {
        console.error('Error creating fund request:', error);
        res.redirect('/add-funds?error=حدث خطأ أثناء إرسال طلبك.');
    }
};
