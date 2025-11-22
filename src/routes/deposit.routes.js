const express = require('express');
const router = express.Router();
const Deposit = require('../models/deposit.model');

// POST /api/deposits - إنشاء طلب شحن جديد
// لا حاجة لـ multer بعد الآن
router.post('/', async (req, res) => {
    try {
        // البيانات تأتي الآن من body الطلب مباشرة
        const { userId, amount, method, depositorName, receiptImage } = req.body;

        if (!userId || !amount || !method || !depositorName || !receiptImage) {
            return res.status(400).json({ message: 'بيانات الطلب غير مكتملة.' });
        }

        const newDeposit = new Deposit({
            user: userId,
            amount: Number(amount),
            method,
            depositorName,
            receiptImage // حفظ نص الصورة مباشرة
        });

        await newDeposit.save();
        res.status(201).json({ message: 'تم إرسال طلب الشحن بنجاح! سيتم مراجعته قريباً.' });

    } catch (error) {
        console.error("POST /api/deposits error:", error);
        res.status(500).json({ message: 'حدث خطأ أثناء إرسال الطلب.' });
    }
});

module.exports = router;
