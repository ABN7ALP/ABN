require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require("socket.io");
const { checkRedisConnection } = require('./src/services/queue');
const { initSocket } = require('./src/config/socket');
const { generalLimiter } = require('./src/middleware/rateLimit');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

// --- الإعدادات الأولية ---
const app = express();
const server = http.createServer(app);
const io = initSocket(server);

// --- Middlewares ---
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser()); 
app.use((req, res, next) => {
    req.io = io;
    next();
});

// --- استدعاء المسارات ---
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

// --- إعداد حماية CSRF ---
const csrfProtection = csrf({ 
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' } 
});

// ==========================================================
// 🎯🎯🎯 القسم الأول: تعريف جميع مسارات الـ API 🎯🎯🎯
// ==========================================================
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});
app.use('/api', csrfProtection);
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
app.get('/api/health', async (req, res) => { /* ... */ });

// ==========================================================
// 🎯🎯🎯 القسم الثاني: خدمة الملفات الثابتة (بعد الـ API) 🎯🎯🎯
// ==========================================================
let publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
  publicPath = path.join(__dirname, '..', 'public');
}
app.use(express.static(publicPath));

// ==========================================================
// 🎯🎯🎯 القسم الثالث: الـ Catch-all (بعد الملفات الثابتة) 🎯🎯🎯
// ==========================================================
// خدمة الملفات الثابتة
app.use(express.static(publicPath));

// ✔✔ إصلاح مشكلة socket.io client
app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(require.resolve('socket.io/client-dist/socket.io.js'));
});

// catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ==========================================================
// 🎯🎯🎯 القسم الرابع: معالجات الأخطاء (في النهاية) 🎯🎯🎯
// ==========================================================
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        console.warn(`CSRF Token Error: IP=${req.ip}, URL=${req.originalUrl}`);
        res.status(403).json({ message: 'خطأ في التحقق من الجلسة. يرجى تحديث الصفحة والمحاولة مرة أخرى.' });
    } else {
        next(err);
    }
});

// --- الاتصال بقاعدة البيانات وبدء تشغيل الخادم ---
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully!');
    require('./src/services/telegramBot');
    setTimeout(async () => { /* ... فحص Redis ... */ }, 2000);
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => console.error('Could not connect to MongoDB:', err));
