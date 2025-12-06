// routes/deposit.routes.js
const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const Deposit = require('../models/deposit.model');
const Notification = require('../models/notification.model');
const UploadService = require('../services/uploadService'); // 🆕 استيراد خدمة الرفع

// POST إنشاء طلب شحن جديد

// POST إنشاء طلب شحن جديد
router.post('/', async (req, res) => {
    try {
        const { userId, amount, method, depositorName, receiptImage } = req.body;

        // التحقق من وجود البيانات الأساسية
        if (!userId || !amount || !method || !depositorName || !receiptImage) {
            return res.status(400).json({ message: 'بيانات الطلب غير مكتملة.' });
        }

        let receiptImageUrl = null;
        let receiptPublicId = null;

        // 🆕 معالجة صورة الإيصال
        if (receiptImage && receiptImage.startsWith('data:image')) {
            console.log('📤 جاري رفع صورة الإيصال إلى Cloudinary...');
            
            const uploadResult = await UploadService.uploadImage(
                receiptImage, 
                'smm-store/deposits' // 🔄 فولدر مخصص للإيصالات
            );
            
            if (uploadResult.success) {
                receiptImageUrl = uploadResult.url;
                receiptPublicId = uploadResult.publicId;
                console.log('✅ تم رفع صورة الإيصال بنجاح');
            } else {
                console.error('❌ فشل رفع صورة الإيصال:', uploadResult.error);
                return res.status(500).json({ message: 'فشل رفع صورة الإيصال. يرجى المحاولة مرة أخرى.' });
            }
        } else {
            return res.status(400).json({ message: 'صورة الإيصال غير صالحة.' });
        }

        // إنشاء طلب الشحن مع رابط الصورة
        const newDeposit = new Deposit({
            user: userId,
            amount: Number(amount),
            method,
            depositorName,
            receiptImage: receiptImageUrl, // 🔄 تخزين الرابط فقط
            receiptPublicId: receiptPublicId // 🆕 تخزين الـ publicId
        });

        await newDeposit.save();
        req.io.emit('new-deposit');
        
        res.status(201).json({ 
            message: 'تم إرسال طلب الشحن بنجاح!',
            depositId: newDeposit._id 
        });

    } catch (error) {
        console.error("Deposit POST error:", error);
        res.status(500).json({ message: 'حدث خطأ أثناء إرسال الطلب.' });
    }
});

// GET جلب كل طلبات الشحن
router.get('/', async (req, res) => {
    try {
        const { week } = req.query; // 🎯 جلب رقم الأسبوع من الطلب
        let query = {};

        if (week && !isNaN(parseInt(week))) {
            const weekOffset = parseInt(week);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dayOfWeek = today.getDay();

            const startDate = new Date(today);
            startDate.setDate(today.getDate() - dayOfWeek - (weekOffset * 7));
            
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);

            query.createdAt = { $gte: startDate, $lt: endDate };
        }

        const deposits = await Deposit.find(query) // 🎯 تطبيق الفلتر على الاستعلام
            .populate('user', 'username')
            .sort({ createdAt: -1 });
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

        // إنشاء إشعار
        const notificationMessage = `تمت الموافقة على طلب الشحن الخاص بك وإضافة ${deposit.amount.toFixed(2)}$ إلى رصيدك.`;
        const newNotification = new Notification({
            user: deposit.user,
            message: notificationMessage,
            link: '/my-orders.html'
        });
        await newNotification.save();

        // إرسال الإشعار
        req.io.emit('new-notification', { 
            userId: deposit.user.toString(),
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
        const deposit = await Deposit.findById(req.params.id);
        
        // 🆕 إذا كان الرفض، يمكن حذف الصورة من Cloudinary لتوفير المساحة
        if (deposit.receiptPublicId) {
            await UploadService.deleteImage(deposit.receiptPublicId);
            console.log('🗑️ تم حذف صورة الإيصال من Cloudinary');
        }
        
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
        const userDeposits = await Deposit.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(userDeposits);
    } catch (error) {
        console.error("GET /my-deposits error:", error);
        res.status(500).json({ message: 'فشل جلب معاملات الشحن.' });
    }
});

module.exports = router;
