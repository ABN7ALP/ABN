// services/queue.js
const Queue = require('bull');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');

// إنشاء طابور الإشعارات
const notificationsQueue = new Queue('notifications queue', {
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        // 🆕 إعدادات لـ Render.com (إذا كنت تستخدمه)
        ...(process.env.REDIS_URL && { 
            url: process.env.REDIS_URL 
        })
    },
    defaultJobOptions: {
        removeOnComplete: 100, // الاحتفاظ بـ 100 وظيفة مكتملة
        removeOnFail: 50, // الاحتفاظ بـ 50 وظيفة فاشلة
        attempts: 3, // عدد المحاولات في حالة الفشل
        backoff: {
            type: 'exponential', // زيادة وقت الانتظار بين المحاولات
            delay: 1000 // بدءاً من ثانية واحدة
        }
    }
});

// 🎯 معالج الوظائف - إرسال الإشعارات الجماعية
notificationsQueue.process('broadcast-notification', async (job) => {
    const { message, link, type = 'broadcast' } = job.data;
    
    console.log(`📢 معالجة إشعار جماعي: ${message}`);
    
    try {
        // جلب جميع المستخدمين (بدون كلمات المرور)
        const users = await User.find({})
            .select('_id')
            .lean();
        
        if (!users || users.length === 0) {
            console.log('⚠️ لا يوجد مستخدمين لإرسال الإشعارات');
            return { success: true, usersNotified: 0 };
        }
        
        console.log(`👥 جاري إنشاء إشعارات لـ ${users.length} مستخدم`);
        
        // إنشاء مصفوفة الإشعارات
        const notifications = users.map(user => ({
            user: user._id,
            message,
            link: link || '#',
            type,
            createdAt: new Date()
        }));
        
        // إدخال الإشعارات في قاعدة البيانات
        const result = await Notification.insertMany(notifications, { ordered: false });
        
        console.log(`✅ تم إنشاء ${result.length} إشعار بنجاح`);
        
        return { 
            success: true, 
            usersNotified: result.length,
            message: `تم إرسال الإشعار إلى ${result.length} مستخدم`
        };
        
    } catch (error) {
        console.error('❌ خطأ في معالجة الإشعارات الجماعية:', error);
        throw error; // إعادة رمي الخطأ لإعادة المحاولة
    }
});

// 🎯 معالج الوظائف - إشعارات تحديث الأسعار
notificationsQueue.process('price-update-notification', async (job) => {
    const { 
        platform, 
        serviceName, 
        oldPrice, 
        newPrice, 
        changePercentage 
    } = job.data;
    
    console.log(`💰 معالجة إشعار تحديث سعر: ${platform} - ${serviceName}`);
    
    try {
        const users = await User.find({})
            .select('_id')
            .lean();
        
        if (!users || users.length === 0) {
            return { success: true, usersNotified: 0 };
        }
        
        const priceChange = newPrice > oldPrice ? '📈 ارتفع' : '🎉 انخفض';
        const message = `${priceChange} سعر خدمة ${platform} - ${serviceName} من ${oldPrice}$ إلى ${newPrice}$ (${changePercentage}%)`;
        
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
        
    } catch (error) {
        console.error('❌ خطأ في معالجة إشعارات الأسعار:', error);
        throw error;
    }
});

// 🎯 إضافة وظيفة جديدة للطابور
const addNotificationJob = async (type, data, options = {}) => {
    try {
        const job = await notificationsQueue.add(type, data, {
            delay: options.delay || 0, // تأخير اختياري
            priority: options.priority || 'normal',
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

// 🎯 تنظيف الطابور (للاستخدام في الصيانة)
const cleanQueue = async () => {
    try {
        await notificationsQueue.clean(0, 'completed'); // تنظيف المكتملة
        await notificationsQueue.clean(0, 'failed'); // تنظيف الفاشلة
        console.log('🧹 تم تنظيف الطابور بنجاح');
    } catch (error) {
        console.error('❌ خطأ في تنظيف الطابور:', error);
    }
};

// 🎯 مراقبة أحداث الطابور
notificationsQueue.on('completed', (job, result) => {
    console.log(`✅ اكتملت الوظيفة ${job.id} (${job.name}): ${result.usersNotified || 0} مستخدم`);
});

notificationsQueue.on('failed', (job, error) => {
    console.error(`❌ فشلت الوظيفة ${job.id} (${job.name}):`, error.message);
});

notificationsQueue.on('stalled', (job) => {
    console.warn(`⚠️ توقفت الوظيفة ${job.id} (${job.name})`);
});

module.exports = {
    notificationsQueue,
    addNotificationJob,
    getQueueStats,
    cleanQueue
};
