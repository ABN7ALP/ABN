const Service = require('../models/Service');
const User = require('../models/User');

// @desc    عرض الصفحة الرئيسية (لوحة التحكم)
// @route   GET /dashboard
exports.getDashboardPage = async (req, res) => {
    try {
        // جلب المستخدم الحالي من قاعدة البيانات للحصول على أحدث بيانات (مثل الرصيد)
        const currentUser = await User.findById(req.session.user.id);
        
        // جلب كل الخدمات المتاحة
        const services = await Service.find({ isActive: true });

        // استخراج المنصات المتاحة بدون تكرار
        const platforms = [...new Set(services.map(service => service.platform))];

        res.render('dashboard', {
            user: currentUser, // إرسال بيانات المستخدم المحدثة
            services: services, // إرسال جميع الخدمات
            platforms: platforms, // إرسال قائمة المنصات
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('حدث خطأ في الخادم');
    }
};
