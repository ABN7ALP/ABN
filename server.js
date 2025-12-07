require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { initSocket } = require('./src/config/socket');
const { checkRedisConnection } = require('./src/services/queue');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

// --- 1. إعداد Express و HTTP Server ---
const app = express();
const server = http.createServer(app);

// --- 2. إعداد Socket.IO ---
const io = initSocket(server);

// --- 3. الـ Middlewares الأساسية ---
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser()); 
app.use(mongoSanitize());

// Middleware لجعل io متاحاً لكل الطلبات
app.use((req, res, next) => {
    req.io = io;
    next();
});

// --- 4. تعريف مسارات الـ API ---
// استدعاء ملفات المسارات
const orderRoutes = require('./src/routes/order.routes');
const serviceRoutes = require('./src/routes/service.routes');
const depositRoutes = require('./src/routes/deposit.routes');
const statsRoutes = require('./src/routes/stats.routes.js');
const authRoutes = require('./src/routes/auth.routes.js');
const notificationRoutes = require('./src/routes/notification.routes');
const queueRoutes = require('./src/routes/queue.routes');
const supportRoutes = require('./src/routes/support.routes');
const adminRoutes = require('./src/routes/admin.routes');
const offerRoutes = require('./src/routes/offer.routes');
const { generalLimiter } = require('./src/middleware/rateLimit');

// إعداد حماية CSRF
const csrfProtection = csrf({ 
    cookie: {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict'
    } 
});

// مسار جلب التوكن (يأتي قبل تطبيق الحماية الشاملة)
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// تطبيق الحماية على بقية مسارات /api
app.use('/api', csrfProtection);

// استخدام المسارات المحمية
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

// مسار فحص الصحة (غير محمي بـ CSRF لأنه GET)
app.get('/api/health', async (req, res) => {
    try {
        const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        const redisStatus = await checkRedisConnection() ? 'connected' : 'disconnected';
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: { mongodb: mongoStatus, redis: redisStatus }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- 5. خدمة الملفات الثابتة (يأتي بعد مسارات الـ API) ---
let publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
  publicPath = path.join(__dirname, '..', 'public');
}
app.use(express.static(publicPath));

// --- 6. الـ Catch-all Route (يأتي بعد الملفات الثابتة) ---
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// --- 7. معالجات الأخطاء (في النهاية تماماً) ---
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        console.warn(`CSRF Token Error: IP=${req.ip}, URL=${req.originalUrl}`);
        return res.status(403).json({ message: 'خطأ في التحقق من الجلسة. يرجى تحديث الصفحة والمحاولة مرة أخرى.' });
    }
    // معالج أخطاء عام
    console.error(err.stack);
    res.status(500).json({ message: 'حدث خطأ غير متوقع في الخادم.' });
});

// --- 8. تشغيل الخادم ---
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully!');
    
    setTimeout(async () => {
        const isConnected = await checkRedisConnection();
        console.log(isConnected ? '✅ تم الاتصال بـ Redis بنجاح' : '⚠️ فشل الاتصال بـ Redis');
    }, 2000);

    require('./src/services/telegramBot');

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Redis URL: ${process.env.REDIS_URL ? 'محدد' : 'غير محدد'}`);
    });
  })
  .catch(err => {
    console.error('Could not connect to MongoDB:', err);
    process.exit(1); // إيقاف التطبيق إذا فشل الاتصال بقاعدة البيانات
  });
