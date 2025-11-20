const mongoose = require('mongoose');
const Notification = mongoose.model('Notification');

const notificationController = {};

// @desc    عرض صفحة الإشعارات
// @route   GET /notifications
notificationController.getNotificationsPage = async (req, res) => {
    try {
        // جلب كل إشعارات المستخدم، الأحدث أولاً
        const notifications = await Notification.find({ user: req.session.user.id })
            .sort({ createdAt: -1 });

        res.render('notifications', {
            pageTitle: 'الإشعارات',
            user: req.session.user,
            notifications: notifications
        });

        // بعد عرض الصفحة، قم بتحديث الإشعارات غير المقروءة إلى مقروءة في الخلفية
        // هذا لن يؤثر على العرض الحالي، ولكنه سيحدث الحالة في قاعدة البيانات
        await Notification.updateMany(
            { user: req.session.user.id, isRead: false },
            { $set: { isRead: true } }
        );

    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.redirect('/dashboard');
    }
};

// @desc    تعليم كل الإشعارات كمقروءة
// @route   POST /notifications/mark-all-read
notificationController.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.session.user.id, isRead: false },
            { $set: { isRead: true } }
        );
        res.redirect('/notifications');
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.redirect('/notifications');
    }
};


module.exports = notificationController;
