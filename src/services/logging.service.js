const Log = require('../models/log.model');

/**
 * دالة مساعدة لإنشاء سجل أمني في قاعدة البيانات.
 * تعمل بشكل غير متزامن ولا توقف تنفيذ الكود.
 * @param {string} level - مستوى الخطورة (INFO, WARN, ERROR, CRITICAL)
 * @param {string} eventType - نوع الحدث (e.g., LOGIN_SUCCESS)
 * @param {string} message - رسالة وصفية
 * @param {object} details - كائن يحتوي على تفاصيل إضافية (userId, ip, etc.)
 */
exports.createLog = (level, eventType, message, details = {}) => {
    // التحقق من أن النموذج تم تحميله بشكل صحيح
    if (!Log) {
        console.error('Log model is not available. Cannot create log.');
        return;
    }

    Log.create({
        level,
        eventType,
        message,
        details
    }).catch(err => {
        console.error('Failed to write to log database:', err.message);
    });
};
