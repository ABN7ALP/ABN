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


const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// 🎯 إعداد Socket.IO الموحد (مرة واحدة فقط)
const io = initSocket(server);




// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

// مسارات الـ API
app.use('/api/support', supportRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/queue', queueRoutes); // أضف هذا
app.use('/api/', generalLimiter);


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

require('./src/services/telegramBot'); // 🎯 3. استدعاء البوت ليبدأ بالعمل


// تشغيل الخادم
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Redis URL: ${process.env.REDIS_URL ? 'محدد' : 'غير محدد'}`);
});


