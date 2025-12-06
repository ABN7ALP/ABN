const mongoose = require('mongoose');

// 🎯 1. مخطط الرسالة المحدث
const messageSchema = new mongoose.Schema({
    sender: { type: String, enum: ['user', 'support'], required: true },
    text: { type: String }, // لم يعد مطلوباً، يمكن أن تكون الرسالة صورة فقط
    imageUrl: { type: String }, // رابط الصورة من Cloudinary
    imagePublicId: { type: String }, // المعرف لحذف الصورة من Cloudinary
    timestamp: { type: Date, default: Date.now }
});

// 🎯 2. مخطط المحادثة المحدث مع الحذف التلقائي
const supportChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    messages: [messageSchema],
    createdAt: { 
        type: Date, 
        default: Date.now, 
        expires: '24h' // 🎯 سيتم حذف المستند تلقائياً بعد 24 ساعة
    }
});

module.exports = mongoose.model('SupportChat', supportChatSchema);
