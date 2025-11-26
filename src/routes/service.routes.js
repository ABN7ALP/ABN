const express = require('express');
const router = express.Router();
const Service = require('../models/service.model');
const { v4: uuidv4 } = require('uuid');
// ******** إضافة جديدة ********
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
// ****************************

// GET كل الخدمات
router.get('/', async (req, res) => {
    try {
        const services = await Service.find({});
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الخدمات.' });
    }
});

// POST إضافة خدمة جديدة (الآن محمي)
  
// POST إضافة خدمة جديدة (الآن محمي)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const newService = new Service({ id: uuidv4(), ...req.body });
        await newService.save();

        // 🆕 إرسال إشعار لجميع المستخدمين
        try {
            const users = await User.find({});
            const notifications = users.map(user => ({
                user: user._id,
                message: `🆕 خدمة جديدة: ${newService.platform} - ${newService.name}`,
                link: '/',
                type: 'broadcast'
            }));
            
            await Notification.insertMany(notifications);
            
            // إرسال عبر Socket.io
            req.io.emit('broadcast-notification', { 
                message: `🆕 خدمة جديدة: ${newService.platform} - ${newService.name}`,
                link: '/'
            });
        } catch (notifyError) {
            console.error('Error sending notifications:', notifyError);
            // لا نوقف العملية إذا فشل الإشعار
        }

        // *** إرسال إشارة التحديث الفوري ***
        req.io.emit('new-service');

        res.status(201).json({ message: 'تمت إضافة الخدمة بنجاح!' });
    } catch (error) {
        res.status(500).json({ message: 'فشل إضافة الخدمة.' });
    }
});

// DELETE حذف خدمة
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Service.findOneAndDelete({ id: req.params.id });

        // *** إرسال إشارة التحديث الفوري ***
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

        // 🆕 إذا تغير السعر، أرسل إشعار
        if (oldService && oldService.pricePer1000 !== updatedService.pricePer1000) {
            try {
                const priceChange = updatedService.pricePer1000 > oldService.pricePer1000 ? '📈 ارتفع' : '📉 انخفض';
                
                const users = await User.find({});
                const notifications = users.map(user => ({
                    user: user._id,
                    message: `${priceChange} سعر خدمة ${updatedService.platform} - ${updatedService.name} من ${oldService.pricePer1000}$ إلى ${updatedService.pricePer1000}$`,
                    link: '/',
                    type: 'price_update'
                }));
                
                await Notification.insertMany(notifications);
                
                req.io.emit('broadcast-notification', { 
                    message: `${priceChange} سعر خدمة ${updatedService.platform} - ${updatedService.name} من ${oldService.pricePer1000}$ إلى ${updatedService.pricePer1000}$`,
                    link: '/'
                });
            } catch (notifyError) {
                console.error('Error sending price update notifications:', notifyError);
            }
        }

        // *** إرسال إشارة التحديث الفوري ***
        req.io.emit('service-updated');

        res.status(200).json({ message: 'تم تعديل الخدمة بنجاح!' });
    } catch (error) {
        res.status(500).json({ message: 'فشل تعديل الخدمة.' });
    }
});

module.exports = router;
