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
const { createOrderRules } = require('../middleware/validators'); 

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
                finalPrice = Math.max(0, originalPrice - discount);
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
router.post('/', createOrderRules, async (req, res) => {
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
        const { week } = req.query; // 🎯 جلب رقم الأسبوع من الطلب
        let query = {};

        if (week && !isNaN(parseInt(week))) {
            const weekOffset = parseInt(week);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday...

            // حساب بداية ونهاية الأسبوع المطلوب
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - dayOfWeek - (weekOffset * 7));
            
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);

            query.createdAt = { $gte: startDate, $lt: endDate };
        }

        const orders = await Order.find(query) // 🎯 تطبيق الفلتر على الاستعلام
            .populate('user', 'username email')
            .sort({ createdAt: -1 });
            
        res.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: 'فشل جلب الطلبات' });
    }
});

// --- PUT /api/orders/:id (لتحديث حالة الطلب - حماية إدارية) ---
// 🔽🔽 استبدل دالة تحديث الطلب الحالية بهذه النسخة الكاملة والنهائية 🔽🔽

router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'الطلب غير موجود' });
        }

        const oldStatus = order.status;
        const newStatus = req.body.status;

        if (oldStatus === newStatus) {
            return res.json(order); // لا تغيير، أرجع الطلب كما هو
        }

        // --- الحالة 1: إلغاء طلب نشط (إرجاع الرصيد) ---
        if (newStatus === 'ملغي' && oldStatus !== 'ملغي' && order.user) {
            const user = await User.findById(order.user);
            if (user) {
                user.balance += order.price;
                await user.save();
                
                const refundNotification = new Notification({
                    user: user._id,
                    message: `تم إلغاء طلبك للخدمة "${order.service}" وإرجاع مبلغ ${order.price.toFixed(2)}$ إلى رصيدك.`,
                    link: '/my-orders.html'
                });
                await refundNotification.save();
                req.io.emit('new-notification', { userId: user._id.toString(), notification: refundNotification });
                req.io.emit('deposit-approved', { userId: user._id.toString() }); // لتحديث الرصيد في الواجهة
            }
        }

        // --- 🎯 الحالة 2: إعادة تفعيل طلب ملغي (خصم الرصيد مجدداً) ---
        if (oldStatus === 'ملغي' && newStatus !== 'ملغي' && order.user) {
            const user = await User.findById(order.user);
            if (!user) {
                return res.status(404).json({ message: 'المستخدم المرتبط بهذا الطلب غير موجود.' });
            }

            // التحقق من الرصيد
            if (user.balance < order.price) {
                // الرصيد غير كافٍ
                const insufficientBalanceNotification = new Notification({
                    user: user._id,
                    message: `فشلت محاولة إعادة تفعيل طلبك للخدمة "${order.service}" لعدم كفاية الرصيد. الرصيد المطلوب: ${order.price.toFixed(2)}$.`,
                    link: '/my-orders.html' // يمكن تغييره لرابط شحن الرصيد
                });
                await insufficientBalanceNotification.save();
                req.io.emit('new-notification', { userId: user._id.toString(), notification: insufficientBalanceNotification });

                // إرجاع رسالة خطأ للمدير وعدم تغيير الحالة
                return res.status(400).json({ message: `فشل تحديث الطلب. رصيد المستخدم (${user.balance.toFixed(2)}$) غير كافٍ لتغطية تكلفة الطلب (${order.price.toFixed(2)}$).` });
            }

            // الرصيد كافٍ، قم بالخصم
            user.balance -= order.price;
            await user.save();

            const reactivateNotification = new Notification({
                user: user._id,
                message: `تم إعادة تفعيل طلبك للخدمة "${order.service}" وخصم مبلغ ${order.price.toFixed(2)}$ من رصيدك.`,
                link: '/my-orders.html'
            });
            await reactivateNotification.save();
            req.io.emit('new-notification', { userId: user._id.toString(), notification: reactivateNotification });
            req.io.emit('deposit-approved', { userId: user._id.toString() }); // لتحديث الرصيد في الواجهة
        }

        // --- تحديث حالة الطلب وحفظها ---
        order.status = newStatus;
        const updatedOrder = await order.save();

        // إرسال إشعار عام بتحديث الحالة (إذا لم يتم إرسال إشعار خاص أعلاه)
        if (oldStatus !== 'ملغي' && newStatus !== 'ملغي' && updatedOrder.user) {
            const notificationMessage = `تم تحديث حالة طلبك للخدمة "${updatedOrder.service}" إلى: ${newStatus}.`;
            const newNotification = new Notification({
                user: updatedOrder.user,
                message: notificationMessage,
                link: '/my-orders.html'
            });
            await newNotification.save();
            req.io.emit('new-notification', { userId: updatedOrder.user.toString(), notification: newNotification });
        }

        req.io.emit('order-status-updated', updatedOrder);
        res.json(updatedOrder);

    } catch (error) {
        console.error("Order update error:", error);
        res.status(500).json({ message: 'فشل تحديث الطلب بسبب خطأ في الخادم.' });
    }
});

// 🔼🔼 نهاية الاستبدال 🔼🔼



// --- GET /api/orders/my-orders - جلب طلبات المستخدم المسجل دخوله ---
router.get('/my-orders', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(401).json({ message: 'لم يتم تحديد المستخدم.' });
    }

    try {
        const userOrders = await Order.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(userOrders);
    } catch (error) {
        console.error("GET /my-orders error:", error);
        res.status(500).json({ message: 'فشل جلب الطلبات.' });
    }
});

// --- POST /api/orders/pay-with-balance (النسخة الآمنة والمكتملة) ---
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

// 🆕 تحديث الكاش عند الطلب مباشرة من الـ routes مع req.io.emit
router.post('/offers', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        // 🔽 الكود الأصلي من offer.routes.js - إضافة عرض جديد
        console.log('📥 استقبال طلب إنشاء عرض:', req.body);
        
        if (!req.body.title || !req.body.description) {
            return res.status(400).json({ message: 'العنوان والوصف مطلوبان' });
        }

        if (!req.body.discountPercentage && !req.body.discountAmount) {
            return res.status(400).json({ message: 'يجب إدخال نسبة خصم أو مبلغ خصم' });
        }

        if (!req.body.startDate || !req.body.endDate) {
            return res.status(400).json({ message: 'يجب تحديد تاريخ البدء والانتهاء' });
        }

        const offerData = {
            title: req.body.title,
            description: req.body.description,
            startDate: new Date(req.body.startDate),
            endDate: new Date(req.body.endDate),
            targetUsers: req.body.targetUsers || 'all',
            services: req.body.services || []
        };

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

        // 🆕 إرسال إشعار لجميع المستخدمين
        try {
            const users = await User.find({});
            if (users && users.length > 0) {
                const notifications = users.map(user => ({
                    user: user._id,
                    message: `🎊 ${newOffer.title} - ${newOffer.description}`,
                    link: '/',
                    type: 'offer'
                }));
                
                await Notification.insertMany(notifications);
                
                req.io.emit('broadcast-notification', {
                    message: `🎊 ${newOffer.title} - ${newOffer.description}`,
                    link: '/'
                });
            }
        } catch (notificationError) {
            console.error('⚠️ خطأ في إرسال الإشعارات:', notificationError);
        }

        // 🎯 تحديث الكاش بعد نجاح الإضافة
        clearOffersCache();
        
        // 🔥 أرسل event جديد للمستمعين الآخرين
        if (req.io) {
            req.io.emit('new-offer');
            console.log('📢 تم إرسال event new-offer عبر Socket.io');
        }

        res.status(201).json({ 
            message: 'تم إنشاء العرض بنجاح وإرسال الإشعارات!',
            offer: newOffer 
        });

    } catch (error) {
        console.error('❌ خطأ في إنشاء العرض:', error);
        
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

router.put('/offers/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        // 🔽 الكود الأصلي من offer.routes.js - تعديل عرض
        const updatedOffer = await Offer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updatedOffer) {
            return res.status(404).json({ message: 'العرض غير موجود' });
        }

        // 🎯 تحديث الكاش بعد نجاح التعديل
        clearOffersCache();
        
        // 🔥 أرسل event تحديث للمستمعين الآخرين
        if (req.io) {
            req.io.emit('offer-updated');
            console.log('📢 تم إرسال event offer-updated عبر Socket.io');
        }

        res.json({ 
            message: 'تم تحديث العرض بنجاح', 
            offer: updatedOffer 
        });

    } catch (error) {
        console.error('Error updating offer:', error);
        res.status(500).json({ message: 'فشل تحديث العرض' });
    }
});

router.delete('/offers/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        // 🔽 الكود الأصلي من offer.routes.js - حذف عرض
        const deletedOffer = await Offer.findByIdAndDelete(req.params.id);
        
        if (!deletedOffer) {
            return res.status(404).json({ message: 'العرض غير موجود' });
        }

        // 🎯 تحديث الكاش بعد نجاح الحذف
        clearOffersCache();
        
        // 🔥 أرسل event حذف للمستمعين الآخرين
        if (req.io) {
            req.io.emit('offer-deleted');
            console.log('📢 تم إرسال event offer-deleted عبر Socket.io');
        }

        res.json({ 
            message: 'تم حذف العرض بنجاح',
            deletedOffer: deletedOffer 
        });

    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).json({ message: 'فشل حذف العرض' });
    }
});

module.exports = router;
