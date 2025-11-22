const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Deposit = require('../models/deposit.model');
const User = require('../models/user.model');

// إعداد Multer لتخزين الصور في مجلد 'public/uploads'
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // اسم فريد للصورة
    }
});
const upload = multer({ storage: storage });

// POST /api/deposits - إنشاء طلب شحن جديد
router.post('/', upload.single('receipt'), async (req, res) => {
    try {
        const { userId, amount, method, depositorName } = req.body;
            
        if (!req.file) {
            return res.status(400).json({ message: 'الرجاء رفع صورة الإيصال.' });
        }

        const newDeposit = new Deposit({
            user: userId,
            amount: Number(amount),
            method,
            depositorName,
            receiptImageUrl: `/uploads/${req.file.filename}` // المسار الذي سيتم حفظه في قاعدة البيانات
        });

        await newDeposit.save();
        res.status(201).json({ message: 'تم إرسال طلب الشحن بنجاح! سيتم مراجعته قريباً.' });

    } catch (error) {
        console.error("POST /api/deposits error:", error);
        res.status(500).json({ message: 'حدث خطأ أثناء إرسال الطلب.' });
    }
});

module.exports = router;
