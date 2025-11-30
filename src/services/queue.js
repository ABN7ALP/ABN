// services/queue.js - نسخة تعمل بدون Redis
const User = require('../models/user.model');
const Notification = require('../models/notification.model');

// 🆕 نظام طابور مبسط يعمل في الذاكرة (لـ Render.com)
class MemoryQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.concurrency = parseInt(process.env.QUEUE_CONCURRENCY) || 3;
        this.activeWorkers = 0;
    }

    // إضافة وظيفة للطابور
    async add(type, data, options = {}) {
        const job = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            data,
            options,
            createdAt: new Date(),
            attempts: 0,
            maxAttempts: options.attempts || 3
        };

        this.queue.push(job);
        console.log(`✅ تم إضافة وظيفة ${type} إلى الطابور (ID: ${job.id})`);

        // بدء المعالجة إذا لم تكن جارية
        if (!this.isProcessing) {
            this.processQueue();
        }

        return job;
    }

    // معالجة الطابور
    async processQueue() {
        if (this.isProcessing || this.activeWorkers >= this.concurrency) {
            return;
        }

        this.isProcessing = true;

        while (this.queue.length > 0 && this.activeWorkers < this.concurrency) {
            const job = this.queue.shift();
            this.activeWorkers++;
            
            this.processJob(job).finally(() => {
                this.activeWorkers--;
                if (this.queue.length > 0) {
                    this.processQueue();
                } else {
                    this.isProcessing = false;
                }
            });
        }

        this.isProcessing = false;
    }

    // معالجة وظيفة فردية
    async processJob(job) {
        try {
            console.log(`🔧 معالجة وظيفة ${job.type} (ID: ${job.id})`);
            
            let result;
            switch (job.type) {
                case 'broadcast-notification':
                    result = await this.processBroadcastNotification(job.data);
                    break;
                case 'price-update-notification':
                    result = await this.processPriceUpdateNotification(job.data);
                    break;
                default:
                    throw new Error(`نوع الوظيفة غير معروف: ${job.type}`);
            }

            console.log(`✅ اكتملت الوظيفة ${job.id} (${job.type}): ${result.usersNotified || 0} مستخدم`);
            return result;

        } catch (error) {
            console.error(`❌ فشلت الوظيفة ${job.id} (${job.type}):`, error.message);
            
            // إعادة المحاولة إذا كانت المحاولات أقل من الحد الأقصى
            job.attempts++;
            if (job.attempts < job.maxAttempts) {
                console.log(`🔄 إعادة محاولة الوظيفة ${job.id} (المحاولة ${job.attempts + 1})`);
                // تأخير أسي قبل إعادة المحاولة
                const delay = Math.min(1000 * Math.pow(2, job.attempts), 30000);
                setTimeout(() => {
                    this.queue.unshift(job);
                    this.processQueue();
                }, delay);
            } else {
                console.error(`💥 فشلت الوظيفة ${job.id} بعد ${job.attempts} محاولات`);
            }
            
            throw error;
        }
    }

    // معالج الإشعارات الجماعية
    async processBroadcastNotification(data) {
        const { message, link, type = 'broadcast' } = data;
        
        console.log(`📢 معالجة إشعار جماعي: ${message}`);
        
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
    }

    // معالج إشعارات تحديث الأسعار
    async processPriceUpdateNotification(data) {
        const { 
            platform, 
            serviceName, 
            oldPrice, 
            newPrice, 
            changePercentage 
        } = data;
        
        console.log(`💰 معالجة إشعار تحديث سعر: ${platform} - ${serviceName}`);
        
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
    }

    // إحصائيات الطابور
    async getStats() {
        return {
            waiting: this.queue.length,
            active: this.activeWorkers,
            completed: 0, // لا نتتبع المكتملة في هذه النسخة المبسطة
            failed: 0,    // لا نتتبع الفاشلة في هذه النسخة المبسطة
            total: this.queue.length + this.activeWorkers
        };
    }

    // تنظيف الطابور
    async clean() {
        this.queue = [];
        this.activeWorkers = 0;
        this.isProcessing = false;
        console.log('🧹 تم تنظيف الطابور بنجاح');
    }
}

// إنشاء نسخة واحدة من الطابور
const memoryQueue = new MemoryQueue();

// 🎯 دالة مساعدة لإضافة الوظائف
const addNotificationJob = async (type, data, options = {}) => {
    return await memoryQueue.add(type, data, options);
};

// 🎯 دالة للحصول على إحصائيات
const getQueueStats = async () => {
    return await memoryQueue.getStats();
};

// 🎯 دالة للتنظيف
const cleanQueue = async () => {
    return await memoryQueue.clean();
};

module.exports = {
    notificationsQueue: memoryQueue,
    addNotificationJob,
    getQueueStats,
    cleanQueue
};
