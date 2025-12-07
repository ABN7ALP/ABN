const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },

    level: { 
        type: String, 
        enum: ['INFO', 'WARN', 'ERROR', 'CRITICAL'], 
        required: true
    },

    eventType: { type: String, required: true },

    message: { type: String, required: true },

    details: { 
        type: Object,
        required: false // 🩵 اختياري – بس للوضوح
    }

}, { strict: false }); // 🟦 يسمح بإضافة أي بيانات بدون أخطاء


// 🚀 فهارس تسريع البحث
logSchema.index({ timestamp: -1 });
logSchema.index({ level: 1 });
logSchema.index({ eventType: 1 });

// (اختياري) 🧹 حذف تلقائي للسجلات الأقدم من 30 يوم
logSchema.index({ "timestamp": 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
