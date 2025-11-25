const express = require('express');
const router = express.Router();
const Order = require('../models/order.model.js');
const User = require('../models/user.model.js');
const mongoose = require('mongoose');
const Service = require('../models/service.model.js');
const Notification = require('../models/notification.model.js');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');


// --- POST /api/orders (للطلبات العادية عبر واتساب) ---
router.post('/', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        req.io.emit('new-order');
        res.status(201).json(newOrder);
    } catch (error) {
        res.status(400).json({ message: 'فشل حفظ الطلب', error: error.message });
    }
});

// --- GET /api/orders (للوحة التحكم - حماية إدارية) ---
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // نستخدم populate لجلب بيانات المستخدم المرتبط بالطلب إن وجدت
        const orders = await Order.find({})
            .populate('user', 'username email') // جلب اسم المستخدم والبريد فقط
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الطلبات' });
    }
});

// --- PUT /api/orders/:id (لتحديث حالة الطلب - حماية إدارية) ---
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'الطلب غير موجود' });
        }
    
        const oldStatus = order.status;
        const newStatus = req.body.status;
    
        if (oldStatus !== newStatus) {
            order.status = newStatus;
            const updatedOrder = await order.save();
    
            // --- منطق إرسال الإشعار الآمن ---
            // نتحقق من وجود حقل المستخدم وأن الـ ID صالح قبل المتابعة
            if (updatedOrder.user && mongoose.Types.ObjectId.isValid(updatedOrder.user)) {
                const notificationMessage = `تم تحديث حالة طلبك للخدمة "${updatedOrder.service}" إلى: ${newStatus}.`;
                const newNotification = new Notification({
                    user: updatedOrder.user,
                    message: notificationMessage,
                    link: '/my-orders.html'
                });
                await newNotification.save();
    
                req.io.emit('new-notification', {
                    userId: updatedOrder.user.toString(),
                    notification: newNotification
                });
            }
            // --- نهاية منطق الإشعار ---
    
            req.io.emit('order-status-updated', updatedOrder);
            res.json(updatedOrder);
    
        } else {
            res.json(order);
        }
    
    } catch (error) {
        console.error("Order update error:", error); 
        res.status(500).json({ message: 'فشل تحديث الطلب' });
    }
});


// --- GET /api/orders/my-orders - جلب طلبات المستخدم المسجل دخوله ---
// لا نحتاج لـ authMiddleware هنا لأننا نستخدم الـ userId من الـ query
// ولكن يجب أن يتأكد الـ Frontend من إرسال التوكن مع الطلب إلى الـ /api/auth/me
router.get('/my-orders', async (req, res) => {
    // سنحصل على هوية المستخدم من query parameter
    const { userId } = req.query;

    if (!userId) {
        return res.status(401).json({ message: 'لم يتم تحديد المستخدم.' });
    }

    try {
        // ابحث عن كل طلبات المستخدم وقم بترتيبها من الأحدث للأقدم
        const userOrders = await Order.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(userOrders);
    } catch (error) {
        console.error("GET /my-orders error:", error);
        res.status(500).json({ message: 'فشل جلب الطلبات.' });
    }
});


// --- POST /api/orders/pay-with-balance (النسخة الآمنة والمكتملة) ---
router.post('/pay-with-balance', async (req, res) => {
    // 1. نستلم البيانات الأساسية (ونتجاهل السعر القادم من المستخدم للأمان)
    const { userId, service: serviceName, link, quantity, platform } = req.body;

    if (!userId) return res.status(401).json({ message: 'يجب تسجيل الدخول.' });

    // التحقق من أن الكمية رقم صحيح وموجب
    const requestedQuantity = parseInt(quantity);
    if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
        return res.status(400).json({ message: 'الكمية غير صالحة.' });
    }

    try {
        // 2. نجلب المستخدم
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود.' });

        // 3. (هام جداً) نبحث عن الخدمة في قاعدة البيانات للحصول على سعرها الحقيقي
        const serviceDoc = await Service.findOne({ name: serviceName, platform: platform });
        
        if (!serviceDoc) {
            return res.status(404).json({ message: 'الخدمة غير متوفرة حالياً.' });
        }

        // 4. التحقق من قيود الخدمة (min, max, step)
        if (requestedQuantity < serviceDoc.min || requestedQuantity > serviceDoc.max) {
            return res.status(400).json({ message: `الكمية المطلوبة يجب أن تكون بين ${serviceDoc.min} و ${serviceDoc.max}.` });
        }
        if (serviceDoc.step > 1 && requestedQuantity % serviceDoc.step !== 0) {
            return res.status(400).json({ message: `الكمية يجب أن تكون مضاعفاً للخطوة: ${serviceDoc.step}.` });
        }

        // 5. حساب السعر الفعلي
        // السعر لكل وحدة = سعر الألف / 1000
        const pricePerUnit = serviceDoc.pricePer1000 / 1000;
        const finalPrice = pricePerUnit * requestedQuantity;
        const price = parseFloat(finalPrice.toFixed(4)); // لضمان دقة تصل إلى 4 منازل عشرية

        // 6. التحقق من الرصيد
        if (user.balance < price) {
            return res.status(400).json({ message: 'رصيدك غير كافٍ لإتمام هذا الطلب.' });
        }

        // 7. خصم المبلغ وحفظ المستخدم
        user.balance -= price;
        await user.save();

        // 8. إنشاء الطلب
        const newOrder = new Order({
            platform,
            service: serviceName,
            link,
            quantity: requestedQuantity,
            price,
            user: userId,
            status: 'قيد التنفيذ' // نبدأه مباشرة كـ 'قيد التنفيذ' لطلبات الرصيد
        });
        await newOrder.save();

        // 9. إشعار للمدير والعميل
        req.io.emit('new-order');
        
        const notificationMessage = `تم تنفيذ طلبك للخدمة "${serviceName}" بنجاح، بتكلفة ${price.toFixed(2)}$`;
        const newNotification = new Notification({
            user: user._id,
            message: notificationMessage,
            link: '/my-orders.html' 
        });
        await newNotification.save();
        req.io.emit('new-notification', { userId: user._id.toString() });


        // 10. إرسال الاستجابة
        res.status(201).json({
            message: 'تم خصم المبلغ وإنشاء الطلب بنجاح!',
            newBalance: user.balance,
            order: newOrder
        });

    } catch (error) {
        console.error("Pay with balance error:", error);
        res.status(500).json({ message: 'حدث خطأ أثناء معالجة الدفع بالرصيد.' });
    }
});


module.exports = router;
