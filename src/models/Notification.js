const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user: { // المستخدم الذي سيتلقى الإشعار
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: { // نص الإشعار
        type: String,
        required: true
    },
    link: { // رابط اختياري لينتقل إليه المستخدم عند الضغط على الإشعار
        type: String,
        default: '#'
    },
    isRead: { // هل تمت قراءة الإشعار أم لا
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

mongoose.model('Notification', NotificationSchema);
