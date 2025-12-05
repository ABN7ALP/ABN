const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: String, enum: ['user', 'support'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const supportChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    messages: [messageSchema],
    isResolved: { type: Boolean, default: false }
}, { 
    timestamps: true // هذا يضيف حقلي createdAt و updatedAt تلقائياً
});

// 🎯🎯🎯 السحر يحدث هنا: إنشاء فهرس TTL 🎯🎯🎯
// هذا السطر يخبر MongoDB بحذف أي مستند بعد 24 ساعة (86400 ثانية) من آخر تحديث له (updatedAt)
supportChatSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

const SupportChat = mongoose.model('SupportChat', supportChatSchema);

module.exports = SupportChat;
