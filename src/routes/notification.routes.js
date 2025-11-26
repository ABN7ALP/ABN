const express = require('express');
const router = express.Router();
const Notification = require('../models/notification.model');
const authMiddleware = require('../middleware/auth.middleware'); // سنحتاج للتحقق من هوية المستخدم

// GET /api/notifications - جلب إشعارات المستخدم الحالي
router.get('/', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 }) // ترتيبها من الأحدث للأقدم
            .limit(20); // جلب آخر 20 إشعاراً فقط

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/notifications/mark-read - تحديد كل الإشعارات كمقروءة
router.post('/mark-read', authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, read: false },
            { $set: { read: true } }
        );
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// 🆕 إرسال إشعار لجميع المستخدمين
router.post('/broadcast', async (req, res) => {
    try {
        const { message, link } = req.body;
        
        // جلب جميع المستخدمين
        const users = await User.find({});
        
        // إنشاء إشعار لكل مستخدم
        const notifications = users.map(user => ({
            user: user._id,
            message,
            link: link || '#',
            type: 'broadcast'
        }));
        
        await Notification.insertMany(notifications);
        
        // إرسال عبر Socket.io لجميع المستخدمين المتصلين
        req.io.emit('broadcast-notification', { message, link });
        
        res.json({ message: 'تم إرسال الإشعار لجميع المستخدمين' });
    } catch (error) {
        res.status(500).json({ message: 'فشل إرسال الإشعار' });
    }
});

module.exports = router;
