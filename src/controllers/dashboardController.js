const Service = require('../models/Service');
const User = require('../models/User');
const Order = require('../models/Order'); // <-- إضافة جديدة

// @desc    عرض الصفحة الرئيسية (لوحة التحكم)
// @route   GET /dashboard
exports.getDashboardPage = async (req, res) => {
    try {
        const currentUser = await User.findById(req.session.user.id);
        const services = await Service.find({ isActive: true });
        const platforms = [...new Set(services.map(service => service.platform))];

        res.render('dashboard', {
            user: currentUser,
            services: services,
            platforms: platforms,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('حدث خطأ في الخادم');
    }
};

// @desc    إنشاء طلب جديد
// @route   POST /dashboard/create-order
exports.createOrder = async (req, res) => { // <-- دالة جديدة بالكامل
    try {
        const { serviceId, link, quantity } = req.body;
        const userId = req.session.user.id;

        // 1. التحقق من المدخلات
        if (!serviceId || !link || !quantity) {
            return res.status(400).json({ success: false, message: 'الرجاء ملء جميع الحقول' });
        }

        // 2. جلب الخدمة والمستخدم من قاعدة البيانات
        const service = await Service.findById(serviceId);
        const user = await User.findById(userId);

        if (!service || !user) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على الخدمة أو المستخدم' });
        }

        // 3. التحقق من الكمية (ضمن الحدود المسموحة)
        const numQuantity = parseInt(quantity);
        if (numQuantity < service.minOrder || numQuantity > service.maxOrder) {
            return res.status(400).json({ success: false, message: `الكمية يجب أن تكون بين ${service.minOrder} و ${service.maxOrder}` });
        }

        // 4. حساب التكلفة والتحقق من الرصيد
        const charge = (numQuantity / 1000) * service.pricePer1000;
        if (user.balance < charge) {
            return res.status(400).json({ success: false, message: 'رصيدك غير كافٍ لإتمام هذا الطلب' });
        }

        // 5. خصم الرصيد من المستخدم
        user.balance -= charge;
        await user.save();

        // 6. إنشاء الطلب الجديد في قاعدة البيانات
        await Order.create({
            user: userId,
            service: serviceId,
            link: link,
            quantity: numQuantity,
            charge: charge,
        });

        // 7. إرسال رد ناجح
        res.status(201).json({ 
            success: true, 
            message: 'تم استلام طلبك بنجاح!',
            newBalance: user.balance.toFixed(2) // إرسال الرصيد الجديد لتحديث الواجهة
        });

    } catch (error) {
        console.error('خطأ في إنشاء الطلب:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم أثناء معالجة طلبك' });
    }
};
