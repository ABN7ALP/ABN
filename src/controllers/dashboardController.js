const mongoose = require('mongoose');
const Service = mongoose.model('Service');
const Order = mongoose.model('Order');
const User = mongoose.model('User');

const dashboardController = {};

// @desc    عرض لوحة التحكم الرئيسية
dashboardController.getDashboard = async (req, res) => {
    try {
        const services = await Service.find({ isActive: true });
        const platforms = [...new Set(services.map(s => s.platform))];
        // جلب المستخدم وتحديث بياناته في الجلسة لضمان دقة الرصيد
        const user = await User.findById(req.session.user.id).select('name balance role');
        if (user) {
            req.session.user = { id: user._id, name: user.name, role: user.role, balance: user.balance };
        }
        
        res.render('dashboard', {
            pageTitle: 'لوحة التحكم',
            user: req.session.user, // استخدام المستخدم من الجلسة المحدثة
            services: services,
            platforms: platforms
        });
    } catch (error) {
        console.error("Error in getDashboard:", error);
        res.status(500).send('Server Error');
    }
};

// @desc    إنشاء طلب جديد
dashboardController.createOrder = async (req, res) => {
    try {
        const { serviceId, link, quantity } = req.body;
        const userId = req.session.user.id;

        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
        }

        const numQuantity = parseInt(quantity);
        if (isNaN(numQuantity) || numQuantity < service.minOrder || numQuantity > service.maxOrder) {
            return res.status(400).json({ success: false, message: 'الكمية خارج الحد المسموح به' });
        }

        const charge = (numQuantity / 1000) * service.pricePer1000;
        const currentUser = await User.findById(userId).select('balance');

        if (currentUser.balance < charge) {
            return res.status(400).json({ success: false, message: 'رصيدك غير كافٍ لإتمام العملية' });
        }

        // =================== الإصلاح الحاسم هنا ===================
        // تحديث رصيد المستخدم مباشرة في قاعدة البيانات باستخدام $inc
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { balance: -charge } }, // استخدام $inc لإنقاص القيمة (سالب)
            { new: true } // هذا الخيار يعيد المستند المحدث
        );
        // ==========================================================

        await Order.create({
            user: userId,
            service: serviceId,
            link,
            quantity: numQuantity,
            charge
        });
        
        // تحديث الرصيد في الجلسة ليعكس التغيير فوراً في كل الصفحات
        req.session.user.balance = updatedUser.balance;

        res.status(201).json({
            success: true,
            message: 'تم إنشاء طلبك بنجاح!',
            newBalance: updatedUser.balance // إرسال الرصيد الجديد المحدث
        });

    } catch (error) {
        console.error('خطأ في إنشاء الطلب:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};

module.exports = dashboardController;
