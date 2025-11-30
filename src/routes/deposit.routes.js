const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const Deposit = require('../models/deposit.model');
const Notification = require('../models/notification.model');

// POST إنشاء طلب شحن جديد
router.post('/', async (req, res) => {
    try {
        // ******** هذا هو التصحيح ********
        const { userId, amount, method, depositorName, receiptImage } = req.body;

        // التحقق من وجود البيانات الأساسية
        if (!userId || !amount || !method || !depositorName || !receiptImage) {
            return res.status(400).json({ message: 'بيانات الطلب غير مكتملة.' });
        }

        const newDeposit = new Deposit({
            user: userId, // <-- هنا التصحيح: الموديل يتوقع 'user' وليس 'userId'
            amount: Number(amount),
            method,
            depositorName,
            receiptImage
        });
        // ******** نهاية التصحيح ********

        await newDeposit.save();
        req.io.emit('new-deposit');
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
        

        // 1. إنشاء إشعار جديد
        const notificationMessage = `تمت الموافقة على طلب الشحن الخاص بك وإضافة ${deposit.amount.toFixed(2)}$ إلى رصيدك.`;
        const newNotification = new Notification({
            user: deposit.user,
            message: notificationMessage,
            link: '/my-orders.html' // رابط يوجه المستخدم لصفحة طلباته
        });
        await newNotification.save();

        // 2. إرسال الإشعار عبر Socket.IO إلى المستخدم المحدد
        const userIdString = deposit.user.toString();
        req.io.emit('new-notification', { 
            userId: userIdString,
            notification: newNotification 
        });

        
        req.io.emit('deposit-approved', { userId: deposit.user.toString() });
        req.io.emit('new-deposit');

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
        req.io.emit('new-deposit');
        res.status(200).json({ message: 'تم رفض الطلب.' });
    } catch (error) {
        console.error("Reject error:", error);
        res.status(500).json({ message: 'فشل رفض الطلب.' });
    }
});

// GET /api/deposits/my-deposits - جلب طلبات الشحن للمستخدم الحالي
router.get('/my-deposits', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(401).json({ message: 'لم يتم تحديد المستخدم.' });
    }

    try {
        // ابحث عن كل طلبات الشحن التي تطابق هوية المستخدم وقم بترتيبها من الأحدث للأقدم
        const userDeposits = await Deposit.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(userDeposits);
    } catch (error) {
        console.error("GET /my-deposits error:", error);
        res.status(500).json({ message: 'فشل جلب معاملات الشحن.' });
    }
});

module.exports = router;
