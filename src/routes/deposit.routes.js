const express = require('express');
const router = express.Router();
const Deposit = require('../models/deposit.model');
const User = require('../models/user.model');

// POST /api/deposits - إنشاء طلب شحن جديد
router.post('/', async (req, res) => {
    try {
        const { userId, amount, method, depositorName, receiptImage } = req.body;
        if (!userId || !amount || !method || !depositorName || !receiptImage) {
            return res.status(400).json({ message: 'بيانات الطلب غير مكتملة.' });
        }
        const newDeposit = new Deposit({ user: userId, amount, method, depositorName, receiptImage });
        await newDeposit.save();

        // إرسال إشعار للوحة التحكم
        req.io.emit('new-deposit');

        res.status(201).json({ message: 'تم إرسال طلب الشحن بنجاح! سيتم مراجعته قريباً.' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء إرسال الطلب.' });
    }
});

// GET /api/deposits - جلب كل طلبات الشحن
router.get('/', async (req, res) => {
    try {
        const deposits = await Deposit.find().populate('user', 'username').sort({ createdAt: -1 });
        res.status(200).json(deposits);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب طلبات الشحن.' });
    }
});

// PUT /api/deposits/:id/approve - الموافقة على طلب شحن
router.put('/:id/approve', async (req, res) => {
    try {
        const deposit = await Deposit.findById(req.params.id);
        if (!deposit || deposit.status !== 'pending') {
            return res.status(404).json({ message: 'الطلب غير موجود أو تمت معالجته بالفعل.' });
        }
        await User.findByIdAndUpdate(deposit.user, { $inc: { balance: deposit.amount } });
        deposit.status = 'approved';
        await deposit.save();

        // إرسال إشعار للمستخدم المحدد
        req.io.emit('deposit-approved', { userId: deposit.user.toString() });

        res.status(200).json({ message: 'تمت الموافقة على الطلب وإضافة الرصيد.', deposit });
    } catch (error) {
        res.status(500).json({ message: 'فشل الموافقة على الطلب.' });
    }
});

// PUT /api/deposits/:id/reject - رفض طلب شحن
router.put('/:id/reject', async (req, res) => {
    try {
        const deposit = await Deposit.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
        if (!deposit) return res.status(404).json({ message: 'الطلب غير موجود.' });
        res.status(200).json({ message: 'تم رفض الطلب.', deposit });
    } catch (error) {
        res.status(500).json({ message: 'فشل رفض الطلب.' });
    }
});

module.exports = router;
