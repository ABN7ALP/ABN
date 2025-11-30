const express = require('express');
const router = express.Router();
const Service = require('../models/service.model');
const User = require('../models/user.model'); 
const Notification = require('../models/notification.model');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// 🆕 استيراد نظام الطابور
const { addNotificationJob } = require('../services/queue');

// GET كل الخدمات
router.get('/', async (req, res) => {
    try {
        const services = await Service.find({});
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الخدمات.' });
    }
});

// POST إضافة خدمة جديدة
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const newService = new Service({ id: uuidv4(), ...req.body });
        await newService.save();

        // 🆕 استخدام الطابور بدلاً من العملية المباشرة
        await addNotificationJob('broadcast-notification', {
            message: `🆕 خدمة جديدة: ${newService.platform} - ${newService.name}`,
            link: '/',
            type: 'broadcast'
        }, {
            priority: 'high', // أولوية عالية للإشعارات الجديدة
            delay: 1000 // تأخير ثانية واحدة لضمان حفظ الخدمة أولاً
        });

        // إرسال إشعار فوري عبر Socket.io (بدون انتظار الطابور)
        req.io.emit('broadcast-notification', { 
            message: `🆕 خدمة جديدة: ${newService.platform} - ${newService.name}`,
            link: '/'
        });

        // إرسال إشارة التحديث الفوري
        req.io.emit('new-service');

        res.status(201).json({ message: 'تمت إضافة الخدمة بنجاح!' });
    } catch (error) {
        console.error('❌ خطأ في إضافة الخدمة:', error);
        res.status(500).json({ message: 'فشل إضافة الخدمة.' });
    }
});

// DELETE حذف خدمة
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Service.findOneAndDelete({ id: req.params.id });

        // إرسال إشارة التحديث الفوري
        req.io.emit('service-deleted');

        res.status(200).json({ message: 'تم حذف الخدمة بنجاح!' });
    } catch (error) {
        res.status(500).json({ message: 'فشل حذف الخدمة.' });
    }
});

// PUT تعديل خدمة
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // جلب الخدمة القديمة لمقارنة السعر
        const oldService = await Service.findOne({ id: req.params.id });
        
        const updatedService = await Service.findOneAndUpdate(
            { id: req.params.id }, 
            req.body, 
            { new: true }
        );

        if (!updatedService) {
            return res.status(404).json({ message: 'الخدمة غير موجودة' });
        }

        // 🆕 تحسين إشعارات تغيير السعر باستخدام الطابور
        if (oldService && oldService.pricePer1000 !== updatedService.pricePer1000) {
            const priceChange = updatedService.pricePer1000 > oldService.pricePer1000 ? '📈 ارتفع' : '🎉 انخفض';
            const changePercentage = ((Math.abs(updatedService.pricePer1000 - oldService.pricePer1000) / oldService.pricePer1000) * 100).toFixed(1);
            
            // 🆕 استخدام الطابور للإشعارات الجماعية
            await addNotificationJob('price-update-notification', {
                platform: updatedService.platform,
                serviceName: updatedService.name,
                oldPrice: oldService.pricePer1000,
                newPrice: updatedService.pricePer1000,
                changePercentage: `${changePercentage}%`
            }, {
                priority: 'normal',
                delay: 500 // نصف ثانية تأخير
            });

            // 🆕 إرسال إشعار فوري عبر Socket.io
            if (updatedService.pricePer1000 < oldService.pricePer1000) {
                req.io.emit('broadcast-notification', { 
                    message: `🎉 تخفيض جديد! ${updatedService.platform} - ${updatedService.name} أصبح بسعر ${updatedService.pricePer1000}$ (تخفيض ${changePercentage}%)`,
                    link: '/'
                });
            } else {
                req.io.emit('broadcast-notification', { 
                    message: `${priceChange} سعر خدمة ${updatedService.platform} - ${updatedService.name} إلى ${updatedService.pricePer1000}$`,
                    link: '/'
                });
            }
        }

        // إرسال إشارة التحديث الفوري
        req.io.emit('service-updated');

        res.status(200).json({ message: 'تم تعديل الخدمة بنجاح!' });
    } catch (error) {
        console.error('❌ خطأ في تعديل الخدمة:', error);
        res.status(500).json({ message: 'فشل تعديل الخدمة.' });
    }
});

module.exports = router;
