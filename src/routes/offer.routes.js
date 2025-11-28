const express = require('express');
const router = express.Router();
const Offer = require('../models/offer.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// GET /api/offers/active - جلب العروض النشطة
router.get('/active', async (req, res) => {
    try {
        const now = new Date();
        const activeOffers = await Offer.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).sort({ createdAt: -1 });
        
        res.json(activeOffers);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب العروض' });
    }
});

// POST /api/offers - إنشاء عرض جديد (للمدير فقط)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const newOffer = new Offer(req.body);
        await newOffer.save();

        // 🆕 إرسال إشعار لجميع المستخدمين
        const users = await User.find({});
        const notifications = users.map(user => ({
            user: user._id,
            message: `🎊 ${newOffer.title} - ${newOffer.description}`,
            link: '/',
            type: 'offer'
        }));
        
        await Notification.insertMany(notifications);
        
        // إرسال إشعار فوري
        req.io.emit('broadcast-notification', {
            message: `🎊 ${newOffer.title} - ${newOffer.description}`,
            link: '/'
        });

        res.status(201).json({ message: 'تم إنشاء العرض بنجاح وإرسال الإشعارات!' });
    } catch (error) {
        res.status(500).json({ message: 'فشل إنشاء العرض' });
    }
});

module.exports = router;
