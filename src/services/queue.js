// services/queue.js - النسخة الجديدة مع Redis
const Queue = require('bull');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { sendActivationEmail, sendPasswordResetEmail } = require('../routes/emailConfig'); // 🆕 

// تهيئة Redis connection - استخدم متغير البيئة الخاص بك
const redisConfig = {
    redis: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    defaultJobOptions: {
        removeOnComplete: 100, // احتفظ بـ 100 وظيفة مكتملة
        removeOnFail: 100,     // احتفظ بـ 100 وظيفة فاشلة
        attempts: 3,           // 3 محاولات
        backoff: {
            type: 'exponential', // تأخير أسي
            delay: 1000          // بداية من ثانية واحدة
        }
    }
};

console.log('🔗 محاولة الاتصال بـ Redis:', process.env.REDIS_URL ? 'تم العثور على URL' : 'استخدام الافتراضي');

// إنشاء الطوابير
const notificationsQueue = new Queue('notifications', redisConfig);
const emailQueue = new Queue('emails', redisConfig);

// ==========================================
// ******** معالج الإشعارات الجماعية ********
// ==========================================
notificationsQueue.process('broadcast', 3, async (job) => {
    console.log(`📢 بدء معالجة إشعار جماعي (${job.id}): ${job.data.message}`);
    
    const { message, link, type = 'broadcast' } = job.data;
    
    try {
        // جلب جميع المستخدمين
        const users = await User.find({}).select('_id').lean();
        
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
            read: false,
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
        console.error(`❌ فشل إرسال الإشعارات:`, error);
        throw error;
    }
});




// ==========================================
// ******** معالج الإيميلات ********
// ==========================================
emailQueue.process('send-email', 1, async (job) => {
    console.log(`📧 معالجة إيميل (${job.id}): ${job.data.to}`);
    
    const { to, subject, html, type = 'general' } = job.data;
    
    try {
        // هنا يمكنك إضافة منطق إرسال الإيميل
        // يمكنك استخدام sendActivationEmail أو sendPasswordResetEmail
        console.log(`✅ تمت معالجة إيميل لـ ${to}`);
        
        return { success: true, message: 'تم إرسال الإيميل' };
        
    } catch (error) {
        console.error('❌ فشل إرسال الإيميل:', error);
        throw error;
    }
});



// ==========================================
// ******** مراقبة حالة الطوابير (مُحسّن) ********
// ==========================================
notificationsQueue.on('failed', (job, err) => {
    console.error(`💥 [Notifications Queue] Job ${job.id} (${job.name}) failed:`, err.message);
});

emailQueue.on('failed', (job, err) => {
    // 🆕 سجل خطأ أكثر تفصيلاً للإيميلات
    console.error(`❌ [Email Queue] Job ${job.id} (${job.name}) failed for email: ${job.data.email}. Error:`, err.message);
});

notificationsQueue.on('completed', (job, result) => {
    console.log(`✅ [Notifications Queue] Job ${job.id} (${job.name}) completed.`);
});

emailQueue.on('completed', (job, result) => {
    // 🆕 سجل نجاح أكثر تفصيلاً للإيميلات
    if (result.success) {
        console.log(`✅ [Email Queue] Job ${job.id} completed successfully for: ${result.email}`);
    } else {
        console.warn(`⚠️ [Email Queue] Job ${job.id} completed but failed to send for: ${result.email}`);
    }
});



// ==========================================
// ******** معالج تحديثات الأسعار ********
// ==========================================
notificationsQueue.process('price-update', 2, async (job) => {
    console.log(`💰 بدء معالجة تحديث سعر (${job.id})`);
    
    const { platform, serviceName, oldPrice, newPrice, changePercentage } = job.data;
    
    try {
        const users = await User.find({}).select('_id').lean();
        
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
            read: false,
            createdAt: new Date()
        }));
        
        const result = await Notification.insertMany(notifications, { ordered: false });
        
        console.log(`✅ تم إنشاء ${result.length} إشعار تحديث سعر`);
        
        return { 
            success: true, 
            usersNotified: result.length 
        };
        
    } catch (error) {
        console.error('❌ فشل إرسال إشعارات السعر:', error);
        throw error;
    }
});

// ==========================================
// ******** معالج الإيميلات ********
// ==========================================
emailQueue.process('send-email', 1, async (job) => {
    console.log(`📧 معالجة إيميل (${job.id}): ${job.data.to}`);
    
    const { to, subject, html, type = 'general' } = job.data;
    
    try {
        // هنا يمكنك إضافة منطق إرسال الإيميل
        // يمكنك استخدام sendActivationEmail أو sendPasswordResetEmail
        console.log(`✅ تمت معالجة إيميل لـ ${to}`);
        
        return { success: true, message: 'تم إرسال الإيميل' };
        
    } catch (error) {
        console.error('❌ فشل إرسال الإيميل:', error);
        throw error;
    }
});

// ==========================================
// ******** معالج إشعارات العرض الجديد ********
// ==========================================
notificationsQueue.process('new-offer', 2, async (job) => {
    console.log(`🎁 بدء معالجة عرض جديد (${job.id}): ${job.data.title}`);
    
    const { title, description, targetUsers = 'all' } = job.data;
    
    try {
        let users;
        
        if (targetUsers === 'new') {
            // المستخدمون الجدد (أقل من 7 أيام)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            users = await User.find({ 
                createdAt: { $gte: sevenDaysAgo } 
            }).select('_id').lean();
        } else if (targetUsers === 'existing') {
            // المستخدمون الحاليون (أكثر من 7 أيام)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            users = await User.find({ 
                createdAt: { $lt: sevenDaysAgo } 
            }).select('_id').lean();
        } else {
            // جميع المستخدمين
            users = await User.find({}).select('_id').lean();
        }
        
        if (!users || users.length === 0) {
            console.log('⚠️ لا يوجد مستخدمين مستهدفين لهذا العرض');
            return { success: true, usersNotified: 0 };
        }
        
        const message = `🎊 ${title} - ${description}`;
        
        const notifications = users.map(user => ({
            user: user._id,
            message,
            link: '/',
            type: 'offer',
            read: false,
            createdAt: new Date()
        }));
        
        const result = await Notification.insertMany(notifications, { ordered: false });
        
        console.log(`✅ تم إرسال إشعار العرض إلى ${result.length} مستخدم`);
        
        return { 
            success: true, 
            usersNotified: result.length 
        };
        
    } catch (error) {
        console.error('❌ فشل إرسال إشعارات العرض:', error);
        throw error;
    }
});

// ==========================================
// ******** مراقبة حالة الطوابير ********
// ==========================================
notificationsQueue.on('failed', (job, err) => {
    console.error(`💥 فشلت الوظيفة ${job.id} (${job.name}):`, err.message);
});

notificationsQueue.on('completed', (job, result) => {
    console.log(`✅ اكتملت الوظيفة ${job.id} (${job.name}): ${result.usersNotified || 0} مستخدم`);
});

notificationsQueue.on('error', (error) => {
    console.error('❌ خطأ في طابور الإشعارات:', error);
});

emailQueue.on('error', (error) => {
    console.error('❌ خطأ في طابور الإيميلات:', error);
});

// ==========================================
// ******** دوال مساعدة ********
// ==========================================
const addNotificationJob = async (type, data, options = {}) => {
    const jobOptions = {
        priority: options.priority || 'normal',
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        timeout: options.timeout || 30000,
        ...options
    };
    
    return await notificationsQueue.add(type, data, options);
};

const addEmailJob = async (type, data, options = {}) => {
    return await emailQueue.add(type, data, options);
};

// الحصول على إحصائيات الطابور
const getQueueStats = async () => {
    try {
        const [notificationsStats, emailStats] = await Promise.all([
            notificationsQueue.getJobCounts(),
            emailQueue.getJobCounts()
        ]);
        
        return {
            notifications: {
                waiting: notificationsStats.waiting,
                active: notificationsStats.active,
                completed: notificationsStats.completed,
                failed: notificationsStats.failed,
                delayed: notificationsStats.delayed
            },
            emails: {
                waiting: emailStats.waiting,
                active: emailStats.active,
                completed: emailStats.completed,
                failed: emailStats.failed,
                delayed: emailStats.delayed
            }
        };
    } catch (error) {
        console.error('❌ فشل جلب إحصائيات الطابور:', error);
        return null;
    }
};

// تنظيف الطوابير القديمة
const cleanOldQueues = async (days = 7) => {
    try {
        const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        await notificationsQueue.clean(cutoffDate, 'completed');
        await notificationsQueue.clean(cutoffDate, 'failed');
        
        await emailQueue.clean(cutoffDate, 'completed');
        await emailQueue.clean(cutoffDate, 'failed');
        
        console.log(`🧹 تم تنظيف الطوابير الأقدم من ${days} يوم`);
    } catch (error) {
        console.error('❌ فشل تنظيف الطوابير:', error);
    }
};

// فحص حالة Redis
const checkRedisConnection = async () => {
    try {
        const client = notificationsQueue.client;
        const ping = await client.ping();
        return ping === 'PONG';
    } catch (error) {
        console.error('❌ فشل الاتصال بـ Redis:', error.message);
        return false;
    }
};

// إغلاق الطوابير بشكل أنيق
const closeQueues = async () => {
    try {
        await notificationsQueue.close();
        await emailQueue.close();
        console.log('✅ تم إغلاق الطوابير بنجاح');
    } catch (error) {
        console.error('❌ فشل إغلاق الطوابير:', error);
    }
};

// ==========================================
// ******** التصدير ********
// ==========================================
module.exports = {
    notificationsQueue,
    emailQueue,
    addNotificationJob,
    addEmailJob,
    getQueueStats,
    cleanOldQueues,
    checkRedisConnection,
    closeQueues
};
