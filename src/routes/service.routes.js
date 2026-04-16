const express = require('express');
const router = express.Router();
const Service = require('../models/service.model');
const User = require('../models/user.model'); 
const Notification = require('../models/notification.model');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const { serviceRules } = require('../middleware/validators'); 

// 🆕 استيراد نظام الطابور
const { addNotificationJob } = require('../services/queue');

// GET كل الخدمات
// GET كل الخدمات
router.get('/', async (req, res) => {
    try {
        // الإدمن يرى الكل، المستخدمون يرون المرئية فقط
        const isAdmin = req.headers.authorization ? true : false;
        const query = isAdmin ? {} : { isVisible: { $ne: false } };
        const services = await Service.find(query);
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الخدمات.' });
    }
});
// POST إضافة خدمة جديدة
router.post('/', authMiddleware, adminMiddleware, serviceRules, async (req, res) => {
    try {
        const newService = new Service({ id: uuidv4(), ...req.body });
        await newService.save();

        // استخدام Redis Queue
        await addNotificationJob('broadcast', {
            message: `🆕 خدمة جديدة: ${newService.platform} - ${newService.name}`,
            link: '/',
            type: 'broadcast'
        }, {
            priority: 'high',
            delay: 1000
        });

        // إرسال إشعار فوري عبر Socket.io
        req.io.emit('broadcast-notification', { 
            message: `🆕 خدمة جديدة: ${newService.platform} - ${newService.name}`,
            link: '/'
        });

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
        const allowedFields = [
            'name', 'platform', 'pricePer1000', 'shopPricePer1000',
            'min', 'max', 'step', 'type', 'packages', 'idLabel', 'idPlaceholder',
            'allowCustomQuantity', 'customPricePer1000', 'customMin', 'customMax',
            'isVisible'  // ✅ أضف هذا
        ];
        
        const updateData = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) updateData[field] = req.body[field];
        });
        
        const service = await Service.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        
        if (!service) return res.status(404).json({ message: 'الخدمة غير موجودة' });
        res.json({ message: 'تم التعديل بنجاح', service });
    } catch (error) {
        res.status(500).json({ message: 'فشل التعديل', error: error.message });
    }
});

        // 🆕 تحسين إشعارات تغيير السعر باستخدام الطابور
        if (oldService && oldService.pricePer1000 !== updatedService.pricePer1000) {
    const priceChange = updatedService.pricePer1000 > oldService.pricePer1000 ? '📈 ارتفع' : '🎉 انخفض';
    const changePercentage = ((Math.abs(updatedService.pricePer1000 - oldService.pricePer1000) / oldService.pricePer1000) * 100).toFixed(1);
    
    // استخدام Redis Queue
    await addNotificationJob('price-update', {
        platform: updatedService.platform,
        serviceName: updatedService.name,
        oldPrice: oldService.pricePer1000,
        newPrice: updatedService.pricePer1000,
        changePercentage: `${changePercentage}%`
    }, {
        priority: 'normal',
        delay: 500
    });

    // إرسال إشعار فوري
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
