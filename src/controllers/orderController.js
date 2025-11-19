const Order = require('../models/Order');
const User = require('../models/User');

// @desc    عرض صفحة طلبات المستخدم
// @route   GET /orders
exports.getOrdersPage = async (req, res) => {
    try {
        // جلب المستخدم الحالي لتمرير بياناته إلى الشريط العلوي
        const currentUser = await User.findById(req.session.user.id);

        // جلب جميع طلبات المستخدم الحالي فقط
        // .populate('service', 'name') لجلب اسم الخدمة من جدول الخدمات
        // .sort({ createdAt: -1 }) لترتيب الطلبات من الأحدث إلى الأقدم
        const orders = await Order.find({ user: req.session.user.id })
            .populate('service', 'name')
            .sort({ createdAt: -1 });

        // دوال مساعدة لترجمة وتلوين حالة الطلب
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
            translateStatus, // تمرير الدوال إلى ملف EJS
            getStatusBadge,
        });

    } catch (error) {
        console.error('خطأ في جلب الطلبات:', error);
        res.status(500).send('حدث خطأ في الخادم');
    }
};
