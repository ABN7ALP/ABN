const mongoose = require('mongoose');
const User = mongoose.model('User');
const Order = mongoose.model('Order');
const FundRequest = mongoose.model('FundRequest');
const Notification = mongoose.model('Notification'); // <-- استيراد نموذج الإشعارات

const adminController = {};

// @desc    عرض صفحة إدارة المستخدمين
adminController.getUsersPage = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.render('admin/users', { users });
    } catch (error) {
        console.error('Error in getUsersPage:', error);
        res.status(500).send('Server Error');
    }
};

// @desc    عرض صفحة إدارة الطلبات
adminController.getOrdersPage = async (req, res) => {
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
adminController.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        const order = await Order.findByIdAndUpdate(orderId, { status: status }, { new: true });

        // إنشاء إشعار للمستخدم
        await Notification.create({
            user: order.user,
            message: `تم تحديث حالة طلبك رقم ${order._id.toString().slice(-6)} إلى "${status}".`,
            link: `/orders`
        });

        res.redirect('/admin/orders');

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).send('Server Error');
    }
};

// @desc    عرض صفحة طلبات شحن الرصيد
adminController.getFundsPage = async (req, res) => {
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
adminController.updateFundRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const requestId = req.params.id;

        const request = await FundRequest.findById(requestId);
        if (!request || request.status !== 'Pending') {
            return res.status(400).send('الطلب غير صالح أو تمت معالجته بالفعل');
        }

        if (status === 'Approved') {
            await User.findByIdAndUpdate(request.user, {
                $inc: { balance: request.amount }
            });
            // إنشاء إشعار للمستخدم عند الموافقة
            await Notification.create({
                user: request.user,
                message: `تمت الموافقة على طلب شحن الرصيد الخاص بك وإضافة $${request.amount.toFixed(2)} إلى حسابك.`,
                link: '/add-funds'
            });
        } else if (status === 'Rejected') {
            // إنشاء إشعار للمستخدم عند الرفض
            await Notification.create({
                user: request.user,
                message: `تم رفض طلب شحن الرصيد الخاص بك بقيمة $${request.amount.toFixed(2)}.`,
                link: '/add-funds'
            });
        }

        request.status = status;
        await request.save();

        res.redirect('/admin/funds');

    } catch (error) {
        console.error('Error updating fund request status:', error);
        res.status(500).send('Server Error');
    }
};

// @desc    تحديث رصيد المستخدم
adminController.updateUserBalance = async (req, res) => {
    try {
        const { amount, reason } = req.body; // أضفنا حقل السبب
        const userId = req.params.id;

        const amountToAdd = parseFloat(amount);
        if (isNaN(amountToAdd)) {
            return res.status(400).send('المبلغ غير صالح');
        }

        await User.findByIdAndUpdate(userId, { $inc: { balance: amountToAdd } });

        // إنشاء إشعار للمستخدم
        const notifMessage = amountToAdd > 0
            ? `أضاف المشرف $${amountToAdd.toFixed(2)} إلى رصيدك. السبب: ${reason || 'تعديل إداري'}`
            : `خصم المشرف $${Math.abs(amountToAdd).toFixed(2)} من رصيدك. السبب: ${reason || 'تعديل إداري'}`;
        
        await Notification.create({
            user: userId,
            message: notifMessage
        });

        res.redirect('/admin/users');

    } catch (error) {
        console.error('Error updating user balance:', error);
        res.status(500).send('Server Error');
    }
};

module.exports = adminController;
