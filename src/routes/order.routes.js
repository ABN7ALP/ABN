const express = require('express');
const router = express.Router();
const Order = require('../models/order.model.js');
const User = require('../models/user.model.js');
const mongoose = require('mongoose');
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

// --- GET /api/orders (للوحة التحكم) ---
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الطلبات' });
    }
});

// --- PUT /api/orders/:id (لتحديث حالة الطلب) ---
// --- PUT /api/orders/:id (لتحديث حالة الطلب) ---
router.put('/:id', async (req, res) => {
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
            // تحقق من وجود مستخدم وأن الـ ID صالح قبل المتابعة
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



// --- POST /api/orders/pay-with-balance (الكود المصحح) ---
router.post('/pay-with-balance', async (req, res) => {
    // ******** هذا هو التصحيح ********
    const { userId, price, platform, service, link, quantity } = req.body;
    // ******** نهاية التصحيح ********

    if (!userId) return res.status(401).json({ message: 'يجب تسجيل الدخول.' });

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود.' });
        if (user.balance < price) return res.status(400).json({ message: 'رصيدك غير كافٍ.' });

        user.balance -= price;
        await user.save();

        const newOrder = new Order({
            platform,
            service,
            link,
            quantity,
            price,
            user: userId,
            status: 'قيد التنفيذ'
        });
        await newOrder.save();

        req.io.emit('new-order');

        res.status(201).json({
            message: 'تم الدفع بنجاح!',
            newBalance: user.balance
        });

    } catch (error) {
        console.error("Pay with balance error:", error);
        res.status(500).json({ message: 'حدث خطأ أثناء معالجة الدفع.' });
    }
});

// GET /api/orders/my-orders - جلب طلبات المستخدم المسجل دخوله
router.get('/my-orders', async (req, res) => {
    // سنحصل على هوية المستخدم من query parameter
    const { userId } = req.query;

    if (!userId) {
        return res.status(401).json({ message: 'لم يتم تحديد المستخدم.' });
    }

    try {
        const userOrders = await Order.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(userOrders);
    } catch (error) {
        console.error("GET /my-orders error:", error);
        res.status(500).json({ message: 'فشل جلب طلبات المستخدم.' });
    }
});
// ******** نهاية المسار الجديد ********

module.exports = router;

