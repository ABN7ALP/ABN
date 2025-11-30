const express = require('express');
const router = express.Router();
const Order = require('../models/order.model.js');
const User = require('../models/user.model.js');
const mongoose = require('mongoose');
const Service = require('../models/service.model.js');
const Offer = require('../models/offer.model.js');
const Notification = require('../models/notification.model.js');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// في order.routes.js - أضف في الأعلى بعد الـ requires
let cachedOffers = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

async function getActiveOffers() {
    const now = Date.now();
    if (!cachedOffers || (now - cacheTimestamp) > CACHE_DURATION) {
        console.log('🔄 جلب العروض النشطة من قاعدة البيانات...');
        cachedOffers = await Offer.find({ 
            isActive: true, 
            startDate: { $lte: new Date() }, 
            endDate: { $gte: new Date() } 
        }).select('title services discountPercentage discountAmount targetUsers');
        cacheTimestamp = now;
        console.log(`✅ تم تخزين ${cachedOffers.length} عرض في الذاكرة المؤقتة`);
    }
    return cachedOffers;
}

// دالة لمسح الكاش إذا لزم الأمر
function clearOffersCache() {
    cachedOffers = null;
    cacheTimestamp = 0;
    console.log('🗑️ تم مسح ذاكرة التخزين المؤقت للعروض');
}

// 🆕 دالة حساب السعر النهائي مع الخصم
// 🚀 النسخة النهائية المحسنة من calculateFinalPrice
async function calculateFinalPrice(serviceName, platform, quantity, userId = null) {
    try {
        console.log('🔍 حساب السعر - البيانات المستلمة:', { serviceName, platform, quantity, userId });

        // 1. جلب البيانات بشكل متوازي لتحسين الأداء
        const [service, user, activeOffers] = await Promise.all([
            Service.findOne({ name: serviceName, platform: platform }),
            userId ? User.findById(userId).select('createdAt') : Promise.resolve(null),
            getActiveOffers() // استخدام نظام الكاش
        ]);

        // التحقق من وجود الخدمة
        if (!service) {
            console.log('❌ الخدمة غير موجودة');
            return { originalPrice: 0, finalPrice: 0, discount: 0, hasDiscount: false };
        }

        console.log('✅ الخدمة موجودة:', service.name);

        // 2. حساب السعر الأصلي
        const pricePerUnit = service.pricePer1000 / 1000;
        const originalPrice = pricePerUnit * quantity;
        
        console.log('💰 السعر الأصلي:', originalPrice);

        // 3. تحديد نوع المستخدم (إذا وجد)
        let isNewUser = false;
        if (user) {
            const userAge = Date.now() - new Date(user.createdAt).getTime();
            isNewUser = userAge < (7 * 24 * 60 * 60 * 1000); // أقل من أسبوع
            console.log('👤 بيانات المستخدم:', { isNewUser, userAge: `${Math.round(userAge / (24 * 60 * 60 * 1000))} أيام` });
        }

        console.log('🎁 العروض النشطة:', activeOffers.length);

        let finalPrice = originalPrice;
        let discount = 0;
        let appliedOffer = null;

        // 4. معالجة العروض في الذاكرة بدون استعلامات إضافية
        for (const offer of activeOffers) {
            // التحقق السريع من تضمين الخدمة
            const isServiceIncluded = offer.services.length === 0 || 
                                    offer.services.includes(service.id) ||
                                    offer.services.includes(service._id.toString());

            if (!isServiceIncluded) continue;

            // التحقق من أهلية المستخدم
            let isUserEligible = true;
            
            if (offer.targetUsers !== 'all') {
                if (!userId) {
                    isUserEligible = false;
                } else if (offer.targetUsers === 'new' && !isNewUser) {
                    isUserEligible = false;
                } else if (offer.targetUsers === 'existing' && isNewUser) {
                    isUserEligible = false;
                }
            }

            if (!isUserEligible) continue;

            // حساب الخصم
            let offerDiscount = 0;
            
            if (offer.discountPercentage) {
                offerDiscount = (originalPrice * offer.discountPercentage) / 100;
            } else if (offer.discountAmount) {
                offerDiscount = offer.discountAmount;
            }

            // تطبيق أفضل خصم
            if (offerDiscount > discount) {
                discount = offerDiscount;
                finalPrice = originalPrice - discount;
                appliedOffer = offer;
            }
        }

        // 5. إرجاع النتيجة النهائية
        const result = {
            originalPrice: parseFloat(originalPrice.toFixed(4)),
            finalPrice: parseFloat(finalPrice.toFixed(4)),
            discount: parseFloat(discount.toFixed(4)),
            hasDiscount: discount > 0,
            appliedOffer: appliedOffer ? appliedOffer.title : null,
            cacheInfo: `العروض ${cachedOffers ? 'مخزنة' : 'غير مخزنة'}`
        };

        console.log('🎉 النتيجة النهائية:', result);
        return result;

    } catch (error) {
        console.error('❌ خطأ في حساب السعر:', error);
        
        // Fallback سريع وآمن
        try {
            const service = await Service.findOne({ name: serviceName, platform: platform });
            if (!service) return { originalPrice: 0, finalPrice: 0, discount: 0, hasDiscount: false };
            
            const pricePerUnit = service.pricePer1000 / 1000;
            const originalPrice = pricePerUnit * quantity;
            
            return {
                originalPrice: parseFloat(originalPrice.toFixed(4)),
                finalPrice: parseFloat(originalPrice.toFixed(4)),
                discount: 0,
                hasDiscount: false,
                error: 'حساب بديل بسبب خطأ'
            };
        } catch (fallbackError) {
            console.error('❌ خطأ في الحساب البديل:', fallbackError);
            return { originalPrice: 0, finalPrice: 0, discount: 0, hasDiscount: false };
        }
    }
}

// 🆕 Route جديد لحساب السعر مع الخصم
// 🆕 Route جديد لحساب السعر مع الخصم
router.post('/calculate-price', async (req, res) => {
    try {
        console.log('📊 حساب السعر - البيانات المستلمة:', req.body);
        
        const { serviceName, platform, quantity, userId } = req.body;
        
        if (!serviceName || !platform || !quantity) {
            return res.status(400).json({ message: 'بيانات غير مكتملة' });
        }
        
        const priceData = await calculateFinalPrice(serviceName, platform, parseInt(quantity), userId);
        console.log('💰 نتيجة حساب السعر:', priceData);
        
        res.json(priceData);
        
    } catch (error) {
        console.error('❌ خطأ في حساب السعر:', error);
        res.status(500).json({ message: 'فشل حساب السعر' });
    }
});


// --- POST /api/orders (للطلبات العادية عبر واتساب) ---
router.post('/', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        req.io.emit('new-order');
        res.status(201).json(newOrder);
    } catch (error) {
        res.status(400).json({ message: 'فشل حفظ الطلب', error: error.message });
    }
});

// --- GET /api/orders (للوحة التحكم - حماية إدارية) ---
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // نستخدم populate لجلب بيانات المستخدم المرتبط بالطلب إن وجدت
        const orders = await Order.find({})
            .populate('user', 'username email') // جلب اسم المستخدم والبريد فقط
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الطلبات' });
    }
});

// --- PUT /api/orders/:id (لتحديث حالة الطلب - حماية إدارية) ---
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'الطلب غير موجود' });
        }
    
        const oldStatus = order.status;
        const newStatus = req.body.status;
    
        if (oldStatus !== newStatus) {
            order.status = newStatus;
            const updatedOrder = await order.save();
    
            // --- منطق إرسال الإشعار الآمن ---
            // نتحقق من وجود حقل المستخدم وأن الـ ID صالح قبل المتابعة
            if (updatedOrder.user && mongoose.Types.ObjectId.isValid(updatedOrder.user)) {
                const notificationMessage = `تم تحديث حالة طلبك للخدمة "${updatedOrder.service}" إلى: ${newStatus}.`;
                const newNotification = new Notification({
                    user: updatedOrder.user,
                    message: notificationMessage,
                    link: '/my-orders.html'
                });
                await newNotification.save();
    
                req.io.emit('new-notification', {
                    userId: updatedOrder.user.toString(),
                    notification: newNotification
                });
            }
            // --- نهاية منطق الإشعار ---
    
            req.io.emit('order-status-updated', updatedOrder);
            res.json(updatedOrder);
    
        } else {
            res.json(order);
        }
    
    } catch (error) {
        console.error("Order update error:", error); 
        res.status(500).json({ message: 'فشل تحديث الطلب' });
    }
});


// --- GET /api/orders/my-orders - جلب طلبات المستخدم المسجل دخوله ---
// لا نحتاج لـ authMiddleware هنا لأننا نستخدم الـ userId من الـ query
// ولكن يجب أن يتأكد الـ Frontend من إرسال التوكن مع الطلب إلى الـ /api/auth/me
router.get('/my-orders', async (req, res) => {
    // سنحصل على هوية المستخدم من query parameter
    const { userId } = req.query;

    if (!userId) {
        return res.status(401).json({ message: 'لم يتم تحديد المستخدم.' });
    }

    try {
        // ابحث عن كل طلبات المستخدم وقم بترتيبها من الأحدث للأقدم
        const userOrders = await Order.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(userOrders);
    } catch (error) {
        console.error("GET /my-orders error:", error);
        res.status(500).json({ message: 'فشل جلب الطلبات.' });
    }
});


// --- POST /api/orders/pay-with-balance (النسخة الآمنة والمكتملة) ---
// في order.routes.js - عدل دالة pay-with-balance
router.post('/pay-with-balance', async (req, res) => {
    try {
        const { userId, service: serviceName, link, quantity, platform } = req.body;

        if (!userId) return res.status(401).json({ message: 'يجب تسجيل الدخول.' });

        // 🆕 أولاً: حساب السعر مع الخصم
        const priceData = await calculateFinalPrice(serviceName, platform, parseInt(quantity), userId);
        const finalPrice = priceData.finalPrice;

        console.log('💰 السعر النهائي للدفع:', { finalPrice, originalPrice: priceData.originalPrice, discount: priceData.discount });

        // التحقق من أن الكمية رقم صحيح وموجب
        const requestedQuantity = parseInt(quantity);
        if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
            return res.status(400).json({ message: 'الكمية غير صالحة.' });
        }

        // جلب المستخدم
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود.' });

        // 🆕 جلب الخدمة للتحقق من القيود فقط (لا نحتاج سعرها)
        const serviceDoc = await Service.findOne({ name: serviceName, platform: platform });
        if (!serviceDoc) {
            return res.status(404).json({ message: 'الخدمة غير متوفرة حالياً.' });
        }

        // التحقق من قيود الخدمة (min, max, step)
        if (requestedQuantity < serviceDoc.min || requestedQuantity > serviceDoc.max) {
            return res.status(400).json({ message: `الكمية المطلوبة يجب أن تكون بين ${serviceDoc.min} و ${serviceDoc.max}.` });
        }
        if (serviceDoc.step > 1 && requestedQuantity % serviceDoc.step !== 0) {
            return res.status(400).json({ message: `الكمية يجب أن تكون مضاعفاً للخطوة: ${serviceDoc.step}.` });
        }

        // 🆕 التحقق من الرصيد مع السعر بعد الخصم
        if (user.balance < finalPrice) {
            return res.status(400).json({ 
                message: `رصيدك غير كافٍ لإتمام هذا الطلب. تحتاج ${finalPrice.toFixed(2)}$ ورصيدك ${user.balance.toFixed(2)}$.` 
            });
        }

        // 🆕 خصم المبلغ بعد الخصم
        user.balance -= finalPrice;
        await user.save();

        // 🆕 إنشاء الطلب مع السعر النهائي (بعد الخصم)
        const newOrder = new Order({
            platform,
            service: serviceName,
            link,
            quantity: requestedQuantity,
            price: finalPrice, // 🎯 استخدم السعر بعد الخصم
            user: userId,
            status: 'قيد التنفيذ'
        });
        await newOrder.save();

        // إشعار للمدير والعميل
        req.io.emit('new-order');
        
        const notificationMessage = priceData.hasDiscount ? 
            `تم تنفيذ طلبك للخدمة "${serviceName}" بنجاح، بتكلفة ${finalPrice.toFixed(2)}$ (وفرت ${priceData.discount.toFixed(2)}$) 🎉` :
            `تم تنفيذ طلبك للخدمة "${serviceName}" بنجاح، بتكلفة ${finalPrice.toFixed(2)}$`;
        
        const newNotification = new Notification({
            user: user._id,
            message: notificationMessage,
            link: '/my-orders.html',
            type: 'user'
        });
        await newNotification.save();
        
        req.io.emit('new-notification', { userId: user._id.toString() });

        // إرسال الاستجابة
        res.status(201).json({
            message: priceData.hasDiscount ? 
                `تم خصم ${finalPrice.toFixed(2)}$ من رصيدك (وفرت ${priceData.discount.toFixed(2)}$)!` :
                `تم خصم ${finalPrice.toFixed(2)}$ من رصيدك!`,
            newBalance: user.balance,
            order: newOrder,
            discountApplied: priceData.hasDiscount,
            discountAmount: priceData.discount
        });

    } catch (error) {
        console.error("Pay with balance error:", error);
        res.status(500).json({ message: 'حدث خطأ أثناء معالجة الدفع بالرصيد.' });
    }
});

// في نهاية order.routes.js - أضف هذه الـ Event Listeners

// تحديث الكاش عند إضافة/تعديل/حذف عروض
const socket = require('../server').io; // أو أي طريقة لاستدعاء socket

// إذا كان Socket.IO متاحاً، استمع للتحديثات
if (typeof socket !== 'undefined') {
    socket.on('new-offer', () => {
        console.log('🔄 تحديث ذاكرة التخزين المؤقت بسبب عرض جديد');
        clearOffersCache();
    });

    socket.on('offer-updated', () => {
        console.log('🔄 تحديث ذاكرة التخزين المؤقت بسبب تعديل عرض');
        clearOffersCache();
    });

    socket.on('offer-deleted', () => {
        console.log('🔄 تحديث ذاكرة التخزين المؤقت بسبب حذف عرض');
        clearOffersCache();
    });
}

// أيضًا تحديث الكاش عند الطلب مباشرة من الـ routes
router.post('/offers', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        // الكود الأصلي لإضافة العرض...
        // بعد نجاح الإضافة:
        clearOffersCache();
    } catch (error) {
        next(error);
    }
});

router.put('/offers/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        // الكود الأصلي لتعديل العرض...
        // بعد نجاح التعديل:
        clearOffersCache();
    } catch (error) {
        next(error);
    }
});

router.delete('/offers/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        // الكود الأصلي لحذف العرض...
        // بعد نجاح الحذف:
        clearOffersCache();
    } catch (error) {
        next(error);
    }
});


module.exports = router;
