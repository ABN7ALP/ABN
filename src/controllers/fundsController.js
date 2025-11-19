const mongoose = require('mongoose');
const FundRequest = mongoose.model('FundRequest');

const fundsController = {}; // كائن جديد

// @desc    عرض صفحة شحن الرصيد
fundsController.getFundsPage = (req, res) => {
    res.render('add-funds', { 
        pageTitle: 'شحن الرصيد',
        user: req.session.user,
        success_msg: req.query.success,
        error_msg: req.query.error,
    });
};

// @desc    إنشاء طلب شحن رصيد جديد
fundsController.createFundRequest = async (req, res) => {
    try {
        const { method, amount, details } = req.body;
        const userId = req.session.user.id;

        if (!method || !amount || !details) {
            return res.redirect('/add-funds?error=الرجاء ملء جميع الحقول');
        }

        await FundRequest.create({
            user: userId,
            method,
            amount: parseFloat(amount),
            details,
        });

        res.redirect('/add-funds?success=تم إرسال طلبك بنجاح، ستتم مراجعته قريباً.');

    } catch (error) {
        console.error('Error creating fund request:', error);
        res.redirect('/add-funds?error=حدث خطأ أثناء إرسال طلبك.');
    }
};

module.exports = fundsController; // تصدير الكائن بالكامل
