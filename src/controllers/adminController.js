const mongoose = require('mongoose');
const User = mongoose.model('User');
const Order = mongoose.model('Order');
const FundRequest = mongoose.model('FundRequest'); // تم إضافة هذا السطر

// @desc    عرض صفحة إدارة المستخدمين
// @route   GET /admin/users
exports.getUsersPage = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.render('admin/users', { users });
    } catch (error) {
        console.error('Error in getUsersPage:', error);
        res.status(500).send('Server Error');
    }
};

// @desc    عرض صفحة إدارة الطلبات
// @route   GET /admin/orders
exports.getOrdersPage = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name')
            .populate('service', 'name')
            .sort({ createdAt: -1 });

        const translateStatus = (status) => {
            const map = { 'Pending': 'قيد الانتظار', 'In progress': 'قيد التنفيذ', 'Completed': 'مكتمل', 'Canceled': 'ملغي', 'Partial': 'جزئي' };
            return map[status] || status;
        };
        const getStatusBadge = (status) => {
            const map = { 'Pending': 'bg-warning text-dark', 'In progress': 'bg-info text-dark', 'Completed': 'bg-success', 'Canceled': 'bg-danger', 'Partial': 'bg-secondary' };
            return map[status] || 'bg-light text-dark';
        };

        res.render('admin/orders', { 
            orders,
            translateStatus,
            getStatusBadge
        });
    } catch (error) {
        console.error('Error fetching orders for admin:', error);
        res.status(500).send('Server Error');
    }
};

// @desc    تحديث حالة الطلب
// @route   POST /admin/orders/update-status/:id
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        const allowedStatus = ['Pending', 'In progress', 'Completed', 'Canceled', 'Partial'];
        if (!allowedStatus.includes(status)) {
            return res.status(400).send('حالة غير صالحة');
        }

        await Order.findByIdAndUpdate(orderId, { status: status });
        res.redirect('/admin/orders');

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).send('Server Error');
    }
};

// @desc    تحديث رصيد المستخدم
// @route   POST /admin/users/update-balance/:id
exports.updateUserBalance = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.params.id;

        const amountToAdd = parseFloat(amount);
        if (isNaN(amountToAdd)) {
            return res.status(400).send('المبلغ غير صالح');
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { balance: amountToAdd } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).send('المستخدم غير موجود');
        }

        res.redirect('/admin/users');

    } catch (error) {
        console.error('Error updating user balance:', error);
        res.status(500).send('Server Error');
    }
};


// =================================================================
// الدوال الجديدة التي تمت إضافتها الآن
// =================================================================

// @desc    عرض صفحة طلبات شحن الرصيد
// @route   GET /admin/funds
exports.getFundsPage = async (req, res) => {
    try {
        const requests = await FundRequest.find()
            .populate('user', 'name')
            .sort({ createdAt: -1 });
        res.render('admin/funds', { requests });
    } catch (error) {
        console.error('Error fetching fund requests:', error);
        res.status(500).send('Server Error');
    }
};

// @desc    تحديث حالة طلب شحن الرصيد
// @route   POST /admin/funds/update-status/:id
exports.updateFundRequestStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'Approved' or 'Rejected'
        const requestId = req.params.id;

        const request = await FundRequest.findById(requestId);
        if (!request || request.status !== 'Pending') {
            return res.status(400).send('الطلب غير صالح أو تمت معالجته بالفعل');
        }

        // إذا تمت الموافقة، قم بإضافة الرصيد إلى المستخدم
        if (status === 'Approved') {
            await User.findByIdAndUpdate(request.user, {
                $inc: { balance: request.amount }
            });
        }

        // تحديث حالة الطلب نفسه
        request.status = status;
        await request.save();

        res.redirect('/admin/funds');

    } catch (error) {
        console.error('Error updating fund request status:', error);
        res.status(500).send('Server Error');
    }
};
