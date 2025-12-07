require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require("socket.io");
const { checkRedisConnection } = require('./src/services/queue'); // أضف هذا
const adminRoutes = require('./src/routes/admin.routes');
const offerRoutes = require('./src/routes/offer.routes');
const { initSocket, getIo } = require('./src/config/socket');
const { 
    loginLimiter, 
    registerLimiter, 
    passwordResetLimiter, 
    emailVerificationLimiter,
    generalLimiter 
} = require('./src/middleware/rateLimit');

//تعيدل جديد 
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const helmet = require('helmet'); // 🔽🔽 أضف هذا السطر 🔽🔽


const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// 🎯 إعداد Socket.IO الموحد (مرة واحدة فقط)
const io = initSocket(server);

// 🔽🔽 أضف هذا الكود هنا 🔽🔽
// ==========================================================
// 🛡️ تطبيق Helmet للأمان
// ==========================================================
app.use(
    helmet({
        // 🎯 تعطيل سياسة أمان المحتوى (CSP) مؤقتاً لتجنب كسر أي شيء
        // سنتعامل معها بشكل منفصل لاحقاً إذا لزم الأمر.
        contentSecurityPolicy: false, 
        // 🎯 السماح بعرض الصور من مصادر مختلفة (مثل i.ibb.co)
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);
// ==========================================================
// 🔼🔼 نهاية الإضافة 🔼🔼



// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
//تعديل جديد 
app.use(cookieParser());

//تعديل جديد 
const csrfProtection = csrf({ 
    cookie: {
        httpOnly: true, // لا يمكن الوصول للـ cookie عبر JavaScript من جانب العميل
        secure: process.env.NODE_ENV === 'production', // استخدم secure cookies في بيئة الإنتاج (HTTPS)
        sameSite: 'strict' // يمنع إرسال الـ cookie مع الطلبات من مواقع خارجية
    } 
});




// جعل io متاحاً لكل الطلبات
app.use((req, res, next) => {
    req.io = io;
    next();
});

// استدعاء مسارات الطلبات
const orderRoutes = require('./src/routes/order.routes');
const serviceRoutes = require('./src/routes/service.routes');
const depositRoutes = require('./src/routes/deposit.routes');
const statsRoutes = require('./src/routes/stats.routes.js');
const authRoutes = require('./src/routes/auth.routes.js');
const notificationRoutes = require('./src/routes/notification.routes');
const queueRoutes = require('./src/routes/queue.routes'); // أضف هذا
const supportRoutes = require('./src/routes/support.routes');

const PORT = process.env.PORT || 3000;

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// فحص اتصال Redis عند بدء التشغيل
setTimeout(async () => {
    const isConnected = await checkRedisConnection();
    if (isConnected) {
        console.log('✅ تم الاتصال بـ Redis بنجاح');
    } else {
        console.log('⚠️ فشل الاتصال بـ Redis - الطابور قد لا يعمل بشكل صحيح');
        console.log('URL المستخدم:', process.env.REDIS_URL || 'غير محدد');
    }
}, 2000);

// تحديد مسار public
let publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
  publicPath = path.join(__dirname, '..', 'public');
}
app.use(express.static(publicPath));

// ==========================================================
// مسارات الـ API (مع حماية CSRF)
// ==========================================================

// 1. مسار خاص للحصول على توكن CSRF (لا يحتاج لحماية)
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    // نستخدم middleware هنا فقط لتوليد التوكن وإرساله
    res.json({ csrfToken: req.csrfToken() });
});

// 2. تطبيق middleware التحقق من CSRF على جميع مسارات الـ API التالية
app.use('/api', csrfProtection);

// 3. تعريف مسارات الـ API المحمية
app.use('/api/support', supportRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/', generalLimiter);
// ==========================================================
// 🔼🔼 نهاية الاستبدال 🔼🔼



// مسار فحص الصحة
app.get('/api/health', async (req, res) => {
    try {
        const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        const redisStatus = await checkRedisConnection() ? 'connected' : 'disconnected';
        
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                mongodb: mongoStatus,
                redis: redisStatus
            }
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

// منطق Socket.IO
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// توجيه كل الطلبات لـ index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});



// 🔽🔽 أضف هذا الـ Middleware لمعالجة أخطاء CSRF قبل تشغيل الخادم 🔽🔽
// ==========================================================
// معالج أخطاء CSRF المخصص
// ==========================================================
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        console.warn(`CSRF Token Error: IP=${req.ip}, URL=${req.originalUrl}`);
        return res.status(403).json({
            message: 'خطأ في التحقق من الجلسة. يرجى تحديث الصفحة والمحاولة مرة أخرى.'
        });
    }

    console.error(
        `CRITICAL_ERROR: An unexpected error occurred on ${req.method} ${req.originalUrl}. Error: ${err.message}`,
        err.stack
    );

    next(err); // تمرير إلى المعالج العام
});

// ==========================================================
// معالج أخطاء عام نهائي (Fallback Error Handler)
// ==========================================================
app.use((err, req, res, next) => {
    res.status(500).json({
        message: 'حدث خطأ غير متوقع في الخادم.'
    });
});


// تشغيل البوت
require('./src/services/telegramBot');

// تشغيل الخادم
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Redis URL: ${process.env.REDIS_URL ? 'محدد' : 'غير محدد'}`);
});
