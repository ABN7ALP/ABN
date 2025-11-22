const express = require('express');
const router = express.Router();
const Order = require('../models/order.model.js');
const User = require('../models/user.model.js');

// --- POST /api/orders (للطلبات العادية عبر واتساب) ---
router.post('/', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();

        // *** إرسال إشارة التحديث الفوري ***
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

// --- POST /api/orders/pay-with-balance ---
router.post('/pay-with-balance', async (req, res) => {
    const { userId, price, ...orderDetails } = req.body;
    if (!userId) return res.status(401).json({ message: 'يجب تسجيل الدخول.' });

    try {
        const user = await User.findById(userId);
        if (!user || user.balance < price) {
            return res.status(400).json({ message: 'رصيد غير كافٍ.' });
        }

        user.balance -= price;
        await user.save();

        const newOrder = new Order({ ...orderDetails, user: userId, status: 'قيد التنفيذ' });
        await newOrder.save();

        // *** إرسال إشارة التحديث الفوري ***
        req.io.emit('new-order');

        res.status(201).json({
            message: 'تم الدفع بنجاح!',
            newBalance: user.balance
        });

    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء الدفع.' });
    }
});

module.exports = router;
