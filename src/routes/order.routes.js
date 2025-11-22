const express = require('express');
const router = express.Router();
const Order = require('../models/order.model.js');
const User = require('../models/user.model.js');

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
router.put('/:id', async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        if (!updatedOrder) {
            return res.status(404).json({ message: 'الطلب غير موجود' });
        }
        res.json(updatedOrder);
    } catch (error) {
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

module.exports = router;
