const mongoose = require('mongoose');
const User = mongoose.model('User');
const Order = mongoose.model('Order');

// ... (دالة getUsersPage و getOrdersPage و updateOrderStatus بدون تغيير) ...
exports.getUsersPage = async (req, res) => { /*...*/ };
exports.getOrdersPage = async (req, res) => { /*...*/ };
exports.updateOrderStatus = async (req, res) => { /*...*/ };


// @desc    تحديث رصيد المستخدم
// @route   POST /admin/users/update-balance/:id
exports.updateUserBalance = async (req, res) => { // <-- دالة جديدة
    try {
        const { amount } = req.body;
        const userId = req.params.id;

        const amountToAdd = parseFloat(amount);
        if (isNaN(amountToAdd)) {
            return res.status(400).send('المبلغ غير صالح');
        }

        // استخدام $inc لإضافة القيمة إلى الرصيد الحالي بشكل آمن
        // new: true لإرجاع المستند المحدث
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { balance: amountToAdd } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).send('المستخدم غير موجود');
        }

        // إعادة التوجيه إلى صفحة المستخدمين بعد التحديث
        res.redirect('/admin/users');

    } catch (error) {
        console.error('Error updating user balance:', error);
        res.status(500).send('Server Error');
    }
};
