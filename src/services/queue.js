// services/queue.js - نسخة تعمل مع Redis
const Queue = require('bull');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');

// 🎯 إعدادات Redis
let redisConfig = {};

if (process.env.REDIS_URL) {
    // استخدام Redis Cloud
    redisConfig = {
        url: process.env.REDIS_URL,
        tls: {},
        maxRetriesPerRequest: 3,
        enableReadyCheck: false
    };
    console.log('🔗 استخدام Redis Cloud');
} else if (process.env.REDIS_HOST) {
    // استخدام Redis محلي
    redisConfig = {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3
    };
    console.log('🔗 استخدام Redis محلي');
} else {
    // Fallback إلى Redis محلي (للتطوير)
    redisConfig = {
        host: '127.0.0.1',
        port: 6379,
        maxRetriesPerRequest: 3
    };
    console.log('⚠️ استخدام Redis افتراضي (للتطوير)');
}

// 🎯 إنشاء الطابور
const notificationsQueue = new Queue('notifications', redisConfig);

// 🎯 معالج الوظائف
notificationsQueue.process(5, async (job) => { // 5 عمليات متوازية
    const { type, data } = job.data;
    
    console.log(`🔧 معالجة وظيفة ${type} (ID: ${job.id})`);
    
    switch (type) {
        case 'broadcast-notification':
            return await processBroadcastNotification(data);
        case 'price-update-notification':
            return await processPriceUpdateNotification(data);
        default:
            throw new Error(`نوع الوظيفة غير معروف: ${type}`);
    }
});

// 🎯 معالج الإشعارات الجماعية
async function processBroadcastNotification(data) {
    const { message, link, type = 'broadcast' } = data;
    
    console.log(`📢 معالجة إشعار جماعي: ${message}`);
    
    const users = await User.find({}).select('_id').lean();
    
    if (!users || users.length === 0) {
        return { success: true, usersNotified: 0 };
    }
    
    console.log(`👥 جاري إنشاء إشعارات لـ ${users.length} مستخدم`);
    
    const notifications = users.map(user => ({
        user: user._id,
        message,
        link: link || '#',
        type,
        createdAt: new Date()
    }));
    
    const result = await Notification.insertMany(notifications, { ordered: false });
    
    console.log(`✅ تم إنشاء ${result.length} إشعار بنجاح`);
    
    return { 
        success: true, 
        usersNotified: result.length 
    };
}

// 🎯 معالج إشعارات الأسعار
async function processPriceUpdateNotification(data) {
    const { platform, serviceName, oldPrice, newPrice, changePercentage } = data;
    
    console.log(`💰 معالجة إشعار تحديث سعر: ${platform} - ${serviceName}`);
    
    const users = await User.find({}).select('_id').lean();
    
    if (!users || users.length === 0) {
        return { success: true, usersNotified: 0 };
    }
    
    const priceChange = newPrice > oldPrice ? '📈 ارتفع' : '🎉 انخفض';
    const message = `${priceChange} سعر خدمة ${platform} - ${serviceName} من ${oldPrice}$ إلى ${newPrice}$ (${changePercentage})`;
    
    const notifications = users.map(user => ({
        user: user._id,
        message,
        link: '/',
        type: 'price_update',
        createdAt: new Date()
    }));
    
    const result = await Notification.insertMany(notifications, { ordered: false });
    
    console.log(`✅ تم إنشاء ${result.length} إشعار تحديث سعر`);
    
    return { 
        success: true, 
        usersNotified: result.length 
    };
}

// 🎯 دالة مساعدة لإضافة الوظائف
const addNotificationJob = async (type, data, options = {}) => {
    try {
        const job = await notificationsQueue.add({ type, data }, {
            attempts: options.attempts || 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            removeOnComplete: 50,
            removeOnFail: 20,
            ...options
        });
        
        console.log(`✅ تم إضافة وظيفة ${type} إلى الطابور (ID: ${job.id})`);
        return job;
        
    } catch (error) {
        console.error(`❌ خطأ في إضافة وظيفة ${type} إلى الطابور:`, error);
        throw error;
    }
};

// 🎯 إحصائيات الطابور
const getQueueStats = async () => {
    try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            notificationsQueue.getWaiting(),
            notificationsQueue.getActive(),
            notificationsQueue.getCompleted(),
            notificationsQueue.getFailed(),
            notificationsQueue.getDelayed()
        ]);
        
        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length,
            total: waiting.length + active.length + completed.length + failed.length + delayed.length
        };
    } catch (error) {
        console.error('❌ خطأ في جلب إحصائيات الطابور:', error);
        return null;
    }
};

// 🎯 تنظيف الطابور
const cleanQueue = async () => {
    try {
        await notificationsQueue.clean(0, 'completed');
        await notificationsQueue.clean(0, 'failed');
        console.log('🧹 تم تنظيف الطابور بنجاح');
    } catch (error) {
        console.error('❌ خطأ في تنظيف الطابور:', error);
    }
};

// 🎯 مراقبة الطابور
notificationsQueue.on('completed', (job, result) => {
    console.log(`✅ اكتملت الوظيفة ${job.id} (${job.data.type}): ${result.usersNotified || 0} مستخدم`);
});

notificationsQueue.on('failed', (job, error) => {
    console.error(`❌ فشلت الوظيفة ${job.id} (${job.data.type}):`, error.message);
});

notificationsQueue.on('stalled', (job) => {
    console.warn(`⚠️ توقفت الوظيفة ${job.id} (${job.data.type})`);
});

module.exports = {
    notificationsQueue,
    addNotificationJob,
    getQueueStats,
    cleanQueue
};
