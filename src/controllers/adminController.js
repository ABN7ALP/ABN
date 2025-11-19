const mongoose = require('mongoose');
const User = mongoose.model('User');
const Order = mongoose.model('Order'); // <-- إضافة جديدة

// @desc    عرض صفحة إدارة المستخدمين
// @route   GET /admin/users
exports.getUsersPage = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.render('admin/users', { users });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

// @desc    عرض صفحة إدارة الطلبات
// @route   GET /admin/orders
exports.getOrdersPage = async (req, res) => { // <-- دالة جديدة
    try {
        const orders = await Order.find()
            .populate('user', 'name') // جلب اسم المستخدم المرتبط بالطلب
            .populate('service', 'name') // جلب اسم الخدمة المرتبطة بالطلب
            .sort({ createdAt: -1 });

        // دوال مساعدة لترجمة وتلوين الحالة (نفس الدوال من قبل)
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
exports.updateOrderStatus = async (req, res) => { // <-- دالة جديدة
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        // التحقق من أن الحالة المرسلة هي إحدى الحالات المسموح بها
        const allowedStatus = ['Pending', 'In progress', 'Completed', 'Canceled', 'Partial'];
        if (!allowedStatus.includes(status)) {
            return res.status(400).send('حالة غير صالحة');
        }

        await Order.findByIdAndUpdate(orderId, { status: status });

        // إعادة توجيه المشرف إلى نفس الصفحة بعد التحديث
        res.redirect('/admin/orders');

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).send('Server Error');
    }
};
