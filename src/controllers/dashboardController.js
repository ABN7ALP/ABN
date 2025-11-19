const mongoose = require('mongoose');
const Service = mongoose.model('Service');
const Order = mongoose.model('Order');
const User = mongoose.model('User');

const dashboardController = {}; // كائن جديد

// @desc    عرض لوحة التحكم الرئيسية
dashboardController.getDashboard = async (req, res) => {
    try {
        const services = await Service.find({ isActive: true });
        const platforms = [...new Set(services.map(s => s.platform))];
        const user = await User.findById(req.session.user.id).select('name balance');
        res.render('dashboard', {
            pageTitle: 'لوحة التحكم',
            user: user,
            services: services,
            platforms: platforms
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    إنشاء طلب جديد
dashboardController.createOrder = async (req, res) => {
    try {
        const { serviceId, link, quantity } = req.body;
        const userId = req.session.user.id;
        const service = await Service.findById(serviceId);
        const user = await User.findById(userId);

        if (!service) return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
        if (quantity < service.minOrder || quantity > service.maxOrder) {
            return res.status(400).json({ success: false, message: 'الكمية خارج الحد المسموح به' });
        }
        const charge = (quantity / 1000) * service.pricePer1000;
        if (user.balance < charge) {
            return res.status(400).json({ success: false, message: 'رصيدك غير كافٍ لإتمام العملية' });
        }

        user.balance -= charge;
        await user.save();

        await Order.create({
            user: userId,
            service: serviceId,
            link,
            quantity,
            charge
        });
        
        req.session.user.balance = user.balance; // تحديث الرصيد في الجلسة

        res.status(201).json({
            success: true,
            message: 'تم إنشاء طلبك بنجاح!',
            newBalance: user.balance
        });
    } catch (error) {
        console.error('خطأ في إنشاء الطلب:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};

module.exports = dashboardController; // تصدير الكائن بالكامل
