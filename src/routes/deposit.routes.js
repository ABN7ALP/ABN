// =================================================================
// ملف: src/routes/deposit.routes.js (النسخة النهائية والمعدلة)
// =================================================================

const express = require('express');
const router = express.Router();
const multer = require('multer'); // <-- تم استيراد multer للتعامل مع الأخطاء

// استيراد الموديلات
const User = require('../models/user.model');
const Deposit = require('../models/deposit.model');
const Notification = require('../models/notification.model');

// 1. استيراد middleware الرفع السحابي الذي أنشأناه
const upload = require('../middleware/upload.middleware');

// 2. تعديل مسار إنشاء طلب الشحن
//    - upload.single('receiptImage') سيقوم برفع الصورة إلى Cloudinary أولاً
//    - إذا نجح الرفع، سيكمل تنفيذ الكود، وإذا فشل، سيتوقف هنا
router.post('/', upload.single('receiptImage'), async (req, res) => {
    try {
        // 3. استخراج البيانات النصية من الطلب
        const { userId, amount, method, depositorName } = req.body;

        // 4. التحقق من أن الملف تم رفعه بنجاح
        //    (إذا لم يتم رفع ملف، فإن req.file لن يكون موجوداً)
        if (!req.file) {
            return res.status(400).json({ message: 'صورة الإيصال مطلوبة أو أن نوع الملف غير مدعوم.' });
        }

        // 5. الحصول على الرابط الآمن للصورة من Cloudinary
        //    (multer-storage-cloudinary يضع الرابط في req.file.path)
        const receiptImageUrl = req.file.path;

        // التحقق من وجود البيانات الأساسية الأخرى
        if (!userId || !amount || !method || !depositorName) {
            // في حالة عدم اكتمال البيانات، يجب حذف الصورة التي تم رفعها للتو من Cloudinary
            // هذه خطوة أمان لمنع تراكم الصور غير المرتبطة بطلبات
            const cloudinary = require('cloudinary').v2;
            const publicId = req.file.filename; // الحصول على معرّف الصورة
            cloudinary.uploader.destroy(publicId);
            
            return res.status(400).json({ message: 'بيانات الطلب غير مكتملة.' });
        }

        // 6. إنشاء طلب الشحن الجديد مع استخدام رابط الصورة من Cloudinary
        const newDeposit = new Deposit({
            user: userId,
            amount: Number(amount),
            method,
            depositorName,
            receiptImage: receiptImageUrl // <-- هنا نستخدم رابط Cloudinary
        });

        await newDeposit.save();
        req.io.emit('new-deposit');
        res.status(201).json({ message: 'تم إرسال طلب الشحن بنجاح!' });

    } catch (error) {
        console.error("Deposit POST error:", error);

        // 7. معالجة الأخطاء بشكل آمن ومحدد
        //    هذا الكود يلتقط الأخطاء التي قد تحدث أثناء الرفع (مثل حجم الملف أو نوعه)
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'حجم الصورة كبير جداً، الحد الأقصى 5 ميغابايت.' });
            }
            if (error.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({ message: 'الملف المرفوع ليس صورة! الأنواع المسموح بها: jpg, png, gif.' });
            }
        }
        // خطأ عام في الخادم
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
        
        const notificationMessage = `تمت الموافقة على طلب الشحن الخاص بك وإضافة ${deposit.amount.toFixed(2)}$ إلى رصيدك.`;
        const newNotification = new Notification({
            user: deposit.user,
            message: notificationMessage,
            link: '/my-orders.html'
        });
        await newNotification.save();

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
        const userDeposits = await Deposit.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(userDeposits);
    } catch (error) {
        console.error("GET /my-deposits error:", error);
        res.status(500).json({ message: 'فشل جلب معاملات الشحن.' });
    }
});

module.exports = router;
