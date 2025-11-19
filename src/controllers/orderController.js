const Order = require('../models/Order');
const User = require('../models/User');
const Service = require('../models/Service'); // <-- قد يكون هذا السطر ناقصاً

// @desc    عرض صفحة طلبات المستخدم
// @route   GET /orders
exports.getOrdersPage = async (req, res) => {
    try {
        const currentUser = await User.findById(req.session.user.id);

        const orders = await Order.find({ user: req.session.user.id })
            .populate('service', 'name') // هذا السطر هو الذي يسبب الخطأ إذا كانت النماذج غير معرفة بشكل صحيح
            .sort({ createdAt: -1 });

        const translateStatus = (status) => {
            const map = {
                'Pending': 'قيد الانتظار',
                'In progress': 'قيد التنفيذ',
                'Completed': 'مكتمل',
                'Canceled': 'ملغي',
                'Partial': 'جزئي'
            };
            return map[status] || status;
        };

        const getStatusBadge = (status) => {
            const map = {
                'Pending': 'bg-warning text-dark',
                'In progress': 'bg-info text-dark',
                'Completed': 'bg-success',
                'Canceled': 'bg-danger',
                'Partial': 'bg-secondary'
            };
            return map[status] || 'bg-light text-dark';
        };

        res.render('orders', {
            user: currentUser,
            orders: orders,
            translateStatus,
            getStatusBadge,
        });

    } catch (error) {
        console.error('خطأ في جلب الطلبات:', error);
        res.status(500).send('Internal Server Error'); // إرسال رسالة خطأ واضحة
    }
};
