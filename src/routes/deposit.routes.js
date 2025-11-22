const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const Deposit = require('../models/deposit.model');

// POST إنشاء طلب شحن جديد
router.post('/', async (req, res) => {
    try {
        const newDeposit = new Deposit(req.body);
        await newDeposit.save();
        req.io.emit('new-deposit'); // <-- استخدام req.io
        res.status(201).json({ message: 'تم إرسال طلب الشحن بنجاح!' });
    } catch (error) {
        console.error("Deposit POST error:", error);
        res.status(500).json({ message: 'حدث خطأ أثناء إرسال الطلب.' });
    }
});

// GET جلب كل طلبات الشحن
router.get('/', async (req, res) => {
    try {
        const deposits = await Deposit.find({}).populate('user', 'username').sort({ createdAt: -1 });
        res.status(200).json(deposits);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الطلبات.' });
    }
});

// PUT الموافقة على طلب شحن
router.put('/:id/approve', async (req, res) => {
    try {
        const deposit = await Deposit.findById(req.params.id);
        if (!deposit || deposit.status !== 'pending') {
            return res.status(404).json({ message: 'الطلب غير موجود أو تمت معالجته.' });
        }
        await User.findByIdAndUpdate(deposit.user, { $inc: { balance: deposit.amount } });
        deposit.status = 'approved';
        await deposit.save();
        
        req.io.emit('deposit-approved', { userId: deposit.user }); // <-- استخدام req.io
        req.io.emit('new-deposit'); // <-- استخدام req.io

        res.status(200).json({ message: 'تمت الموافقة على الطلب.' });
    } catch (error) {
        console.error("Approve error:", error);
        res.status(500).json({ message: 'فشل الموافقة على الطلب.' });
    }
});

// PUT رفض طلب شحن
router.put('/:id/reject', async (req, res) => {
    try {
        await Deposit.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        req.io.emit('new-deposit'); // <-- استخدام req.io
        res.status(200).json({ message: 'تم رفض الطلب.' });
    } catch (error) {
        console.error("Reject error:", error);
        res.status(500).json({ message: 'فشل رفض الطلب.' });
    }
});

module.exports = router;
