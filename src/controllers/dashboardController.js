const mongoose = require('mongoose');
const Service = mongoose.model('Service');
const User = mongoose.model('User');
const Order = mongoose.model('Order');

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
exports.createOrder = async (req, res) => {
    try {
        const { serviceId, link, quantity } = req.body;
        const userId = req.session.user.id;

        if (!serviceId || !link || !quantity) {
            return res.status(400).json({ success: false, message: 'الرجاء ملء جميع الحقول' });
        }

        const service = await Service.findById(serviceId);
        const user = await User.findById(userId);

        if (!service || !user) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على الخدمة أو المستخدم' });
        }

        const numQuantity = parseInt(quantity);
        if (numQuantity < service.minOrder || numQuantity > service.maxOrder) {
            return res.status(400).json({ success: false, message: `الكمية يجب أن تكون بين ${service.minOrder} و ${service.maxOrder}` });
        }

        const charge = (numQuantity / 1000) * service.pricePer1000;
        if (user.balance < charge) {
            return res.status(400).json({ success: false, message: 'رصيدك غير كافٍ لإتمام هذا الطلب' });
        }

        // =================== التعديل الجذري هنا ===================
        // بدلاً من user.save()، نستخدم findByIdAndUpdate مع $inc
        // هذا يخصم الرصيد مباشرة في قاعدة البيانات وهو أكثر أماناً
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { balance: -charge } }, // استخدمنا $inc مع قيمة سالبة للخصم
            { new: true } // لإرجاع المستند المحدث
        );
        // ==========================================================

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على المستخدم أثناء محاولة تحديث الرصيد.' });
        }

        await Order.create({
            user: userId,
            service: serviceId,
            link: link,
            quantity: numQuantity,
            charge: charge,
        });

        res.status(201).json({ 
            success: true, 
            message: 'تم استلام طلبك بنجاح!',
            newBalance: updatedUser.balance.toFixed(2) // نستخدم الرصيد من المستخدم المحدث
        });

    } catch (error)
     {
        console.error('خطأ في إنشاء الطلب:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم أثناء معالجة طلبك' });
    }
};
