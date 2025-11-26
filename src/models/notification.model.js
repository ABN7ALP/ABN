const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // لمن هذا الإشعار؟
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // نص الإشعار
    message: {
        type: String,
        required: true
    },
    // هل قرأ المستخدم الإشعار؟
    read: {
        type: Boolean,
        default: false
    },
    type: {
        type: String,
        enum: ['user', 'broadcast', 'price_update'],
        default: 'user'
    },
    // رابط يمكن الضغط عليه (اختياري، مثلاً رابط لصفحة "طلباتي")
    link: {
        type: String,
        default: '#'
    }
}, {
    timestamps: true // لإضافة تاريخ إنشاء الإشعار تلقائياً
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
