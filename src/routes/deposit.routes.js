const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const Deposit = require('../models/deposit.model');
const Notification = require('../models/notification.model');
const UploadService = require('../services/uploadService');
const { depositRules } = require('../middleware/validators');
const authMiddleware = require('../middleware/authMiddleware');

// ✨ أضيفي هذا
const rateLimit = require('express-rate-limit');

// ✅ في rateLimit.js - أضف limiter جديد
const depositLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // ساعة واحدة
    max: 5, // 5 طلبات شحن كحد أقصى كل ساعة
    message: {
        success: false,
        message: 'تم تجاوز عدد طلبات الشحن المسموحة. يرجى المحاولة مرة أخرى بعد ساعة.'
    },
    handler: (req, res, next, options) => {
        console.log(`🚨 Deposit limit exceeded for IP: ${req.ip}, User: ${req.user?._id || 'guest'}`);
        res.status(429).json(options.message);
    }
});
// POST إنشاء طلب شحن جديد

router.post('/', depositLimiter, depositRules, async (req, res) => {
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

// ✅ في deposit.routes.js - عدل route عرض الإيصال
// أضف route جديد وآمن لعرض الإيصال
router.get('/receipt/:id', authMiddleware, async (req, res) => {
    try {
        const deposit = await Deposit.findById(req.params.id);
        
        if (!deposit) {
            return res.status(404).json({ message: 'الإيصال غير موجود' });
        }
        
        // 🆕 التحقق من أن المستخدم هو مالك الإيصال أو مدير
        const isOwner = deposit.user.toString() === req.user._id.toString();
        const isAdmin = req.user.isAdmin === true;
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ 
                message: 'غير مصرح لك بعرض هذا الإيصال' 
            });
        }
        
        // 🆕 التحقق من أن الصورة موجودة
        if (!deposit.receiptImage) {
            return res.status(404).json({ message: 'صورة الإيصال غير متوفرة' });
        }
        
        // إرجاع الصورة مع headers أمنية
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Security-Policy', "default-src 'self'");
        res.send(`<img src="${deposit.receiptImage}" style="max-width:100%;">`);
        
    } catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(500).json({ message: 'خطأ في جلب الإيصال' });
    }
});

// ✅ ثم في admin.js - عدل دالة viewReceipt
function viewReceipt(depositId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('يجب تسجيل الدخول');
        return;
    }
    
    const url = `/api/deposits/receipt/${depositId}`;
    const newWindow = window.open();
    
    if (newWindow) {
        newWindow.document.write(`
            <html><head><title>جاري تحميل الإيصال...</title></head>
            <body style="margin:0; background:#333;">
            <div style="text-align:center; color:white; padding:2rem;">
                جاري تحميل الإيصال...
            </div>
            </body></html>
        `);
        newWindow.document.close();
        
        // تحميل الصورة عبر fetch مع التوكن
        fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('فشل تحميل الإيصال');
            return response.text();
        })
        .then(html => {
            newWindow.document.write(html);
            newWindow.document.close();
        })
        .catch(error => {
            newWindow.document.write(`
                <html><body style="text-align:center; padding:2rem;">
                <h3 style="color:red;">❌ ${error.message}</h3>
                </body></html>
            `);
            newWindow.document.close();
        });
    }
}

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
