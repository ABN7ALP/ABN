const express = require('express');
const router = express.Router();
const Offer = require('../models/offer.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { addNotificationJob } = require('../services/queue'); // 🆕 الاستيراد الجديد
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const { translateItems } = require('../services/translation.service'); // 🚀 استيراد الدالة الجديدة


// GET /api/offers/active - جلب العروض النشطة
router.get('/active', async (req, res) => {
    try {
        // 1. تحديد اللغة من هيدر الطلب
        const lang = req.headers['accept-language'] || 'ar';
        let targetLang;
        if (lang.startsWith('en')) targetLang = 'en-US';
        else if (lang.startsWith('tr')) targetLang = 'tr';
        else targetLang = 'ar';

        // 2. جلب العروض النشطة من قاعدة البيانات
        const now = new Date();
        const activeOffers = await Offer.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).sort({ createdAt: -1 }).lean();

        // 3. ترجمة البيانات إذا كانت اللغة ليست العربية
        if (targetLang !== 'ar') {
            const translatedOffers = await translateItems(
                activeOffers,
                ['title', 'description'], // 🚀 الحقول المراد ترجمتها
                targetLang
            );
            return res.status(200).json(translatedOffers);
        }

        // 4. إذا كانت اللغة عربية، أرسل البيانات مباشرة
        res.json(activeOffers);

    } catch (error) {
        console.error('Error fetching active offers:', error);
        res.status(500).json({ message: 'فشل جلب العروض' });
    }
});


// POST /api/offers - إنشاء عرض جديد (للمدير فقط)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        console.log('📥 استقبال طلب إنشاء عرض:', req.body);
        
        // تحقق من البيانات الأساسية
        if (!req.body.title || !req.body.description) {
            return res.status(400).json({ message: 'العنوان والوصف مطلوبان' });
        }

        // تحقق من أن هناك خصم على الأقل
        if (!req.body.discountPercentage && !req.body.discountAmount) {
            return res.status(400).json({ message: 'يجب إدخال نسبة خصم أو مبلغ خصم' });
        }

        // تحقق من التواريخ
        if (!req.body.startDate || !req.body.endDate) {
            return res.status(400).json({ message: 'يجب تحديد تاريخ البدء والانتهاء' });
        }

        // إنشاء العرض مع بيانات آمنة
        const offerData = {
            title: req.body.title,
            description: req.body.description,
            startDate: new Date(req.body.startDate),
            endDate: new Date(req.body.endDate),
            targetUsers: req.body.targetUsers || 'all',
            services: req.body.services || []
        };

        // إضافة الخصم (نسبة أو مبلغ)
        if (req.body.discountPercentage) {
            offerData.discountPercentage = parseInt(req.body.discountPercentage);
        }
        if (req.body.discountAmount) {
            offerData.discountAmount = parseFloat(req.body.discountAmount);
        }

        console.log('📋 بيانات العرض المعدلة:', offerData);

        const newOffer = new Offer(offerData);
        await newOffer.save();

        console.log('✅ تم إنشاء العرض بنجاح:', newOffer);

        // 🎯 إرسال إشعار لجميع المستخدمين باستخدام Redis Queue
        try {
            // أضف مهمة إرسال الإشعارات إلى Redis Queue
            const notificationJob = await addNotificationJob('new-offer', {
                title: newOffer.title,
                description: newOffer.description,
                targetUsers: newOffer.targetUsers || 'all'
            }, {
                priority: 'high',
                delay: 1000, // تأخير ثانية واحدة
                attempts: 3
            });

            console.log(`📨 تم إضافة إشعار العرض إلى Redis Queue (Job ID: ${notificationJob.id})`);

            // إرسال إشعار فوري عبر Socket.io (للمستخدمين المتصلين حالياً)
            req.io.emit('broadcast-notification', {
                message: `🎊 ${newOffer.title} - ${newOffer.description}`,
                link: '/',
                type: 'offer_created'
            });

            // إرسال إشعار خاص للعروض
            req.io.emit('new-offer', {
                message: `🎊 ${newOffer.title} - ${newOffer.description}`,
                offer: newOffer,
                link: '/'
            });

        } catch (notificationError) {
            console.error('⚠️ خطأ في إضافة إشعار العرض إلى الطابور:', notificationError);
            // لا نوقف العملية إذا فشل الإشعار، لكن نرسل إشعاراً فورياً كبديل
            req.io.emit('broadcast-notification', {
                message: `🎊 ${newOffer.title} - ${newOffer.description}`,
                link: '/'
            });
        }

        res.status(201).json({ 
            message: 'تم إنشاء العرض بنجاح!',
            offer: newOffer 
        });

    } catch (error) {
        console.error('❌ خطأ في إنشاء العرض:', error);
        
        // رسالة خطأ أكثر تفصيلاً
        let errorMessage = 'فشل إنشاء العرض';
        
        if (error.name === 'ValidationError') {
            errorMessage = 'بيانات غير صالحة: ' + Object.values(error.errors).map(e => e.message).join(', ');
        } else if (error.code === 11000) {
            errorMessage = 'هذا العرض موجود مسبقاً';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.status(500).json({ 
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET /api/offers - جلب جميع العروض (للمدير)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const offers = await Offer.find({}).sort({ createdAt: -1 });
        res.json(offers);
    } catch (error) {
        console.error('Error fetching offers:', error);
        res.status(500).json({ message: 'فشل جلب العروض' });
    }
});

// DELETE /api/offers/:id - حذف عرض
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Offer.findByIdAndDelete(req.params.id);
        res.json({ message: 'تم حذف العرض بنجاح' });
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).json({ message: 'فشل حذف العرض' });
    }
});

// PUT /api/offers/:id - تحديث عرض
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const updatedOffer = await Offer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json({ message: 'تم تحديث العرض بنجاح', offer: updatedOffer });
    } catch (error) {
        console.error('Error updating offer:', error);
        res.status(500).json({ message: 'فشل تحديث العرض' });
    }
});

module.exports = router;
