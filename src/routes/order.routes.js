const express = require('express');
const router = express.Router();
const Order = require('../models/order.model.js');
const User = require('../models/user.model.js'); // <-- استدعاء موديل المستخدم

// --- POST /api/orders (للطلبات العادية عبر واتساب) ---
router.post('/', async (req, res) => {
    try {
        const { platform, service, link, quantity, price, user } = req.body;
        const newOrder = new Order({ platform, service, link, quantity, price, user });
        await newOrder.save();
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
        const order = await Order.findById(req.params.id);
        if (order) {
            order.status = req.body.status || order.status;
            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'الطلب غير موجود' });
        }
    } catch (error) {
        res.status(500).json({ message: 'فشل تحديث الطلب' });
    }
});

// --- POST /api/orders/pay-with-balance (الـ API الجديد) ---
router.post('/pay-with-balance', async (req, res) => {
    const { platform, service, link, quantity, price, userId } = req.body;

    // 1. التحقق من وجود المستخدم
    if (!userId) {
        return res.status(401).json({ message: 'يجب تسجيل الدخول لاستخدام الرصيد.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود.' });
        }

        // 2. التحقق من أن الرصيد كافٍ
        if (user.balance < price) {
            return res.status(400).json({ message: 'رصيدك غير كافٍ لإتمام هذه العملية.' });
        }

        // 3. خصم المبلغ من رصيد المستخدم
        user.balance -= price;
        await user.save();

        // 4. إنشاء الطلب الجديد
        const newOrder = new Order({
            platform,
            service,
            link,
            quantity,
            price,
            user: userId,
            status: 'قيد التنفيذ' // الطلب يبدأ قيد التنفيذ مباشرة لأنه مدفوع
        });
        await newOrder.save();

        // 5. إرسال رد ناجح مع الرصيد المحدث
        res.status(201).json({
            message: 'تم إنشاء الطلب بنجاح والدفع من رصيدك!',
            order: newOrder,
            newBalance: user.balance // لإرسال الرصيد الجديد للواجهة الأمامية
        });

    } catch (error) {
        console.error("Pay with balance error:", error);
        res.status(500).json({ message: 'حدث خطأ أثناء معالجة الدفع.' });
    }
});


module.exports = router;
