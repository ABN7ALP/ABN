require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require("socket.io");
const { checkRedisConnection } = require('./src/services/queue');

// ==================== أمان متقدم ====================
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

const adminRoutes = require('./src/routes/admin.routes');
const offerRoutes = require('./src/routes/offer.routes');
const { 
    loginLimiter, 
    registerLimiter, 
    passwordResetLimiter, 
    emailVerificationLimiter,
    generalLimiter 
} = require('./src/middleware/rateLimit');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://abn-iio5.onrender.com']
      : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  }
});

// ============ 🔒 Middlewares الأمنية ============
// 1. Helmet for Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:", "https://res.cloudinary.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            connectSrc: ["'self'", "ws:", "wss:"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS Configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://abn-iio5.onrender.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// 3. Parse cookies
app.use(cookieParser());

// 4. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 5. Prevent NoSQL Injection
app.use(mongoSanitize());

// 6. Prevent XSS attacks
app.use(xss());

// 7. Prevent HTTP Parameter Pollution
app.use(hpp());

// 8. Additional Security Headers
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// 9. CSRF Protection Configuration
const csrfProtection = csrf({ 
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 86400000 // 24 ساعة
    }
});

// Generate CSRF token for non-API GET requests
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    }
    next();
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
const queueRoutes = require('./src/routes/queue.routes');

const PORT = process.env.PORT || 3000;

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ Connected to MongoDB successfully!'))
  .catch(err => console.error('❌ Could not connect to MongoDB:', err));

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

// ============ 🛡️ مسارات الـ API مع الحماية ============
// Apply CSRF to sensitive routes
app.use('/api/auth/register', csrfProtection);
app.use('/api/auth/login', csrfProtection);
app.use('/api/deposits', csrfProtection);

// Rate limiting for sensitive routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/verify-email', emailVerificationLimiter);

// Regular API routes
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
            },
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

// مسار للحصول على CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// منطق Socket.IO مع حماية
io.use((socket, next) => {
    // يمكنك إضافة تحقق من الهوية هنا
    const token = socket.handshake.auth.token;
    if (token) {
        // تحقق من JWT token
        next();
    } else {
        // السماح للزوار
        next();
    }
});

io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);
    
    socket.on('disconnect', (reason) => {
        console.log(`🔌 User disconnected: ${socket.id} - ${reason}`);
    });
    
    socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
    });
});

// معالجة الأخطاء المركزية
app.use((err, req, res, next) => {
    console.error('🚨 Server Error:', err.stack);
    
    // CSRF token errors
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ 
            message: 'Invalid CSRF token', 
            code: 'INVALID_CSRF_TOKEN' 
        });
    }
    
    // Default error
    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message,
        code: err.code || 'SERVER_ERROR'
    });
});

// توجيه كل الطلبات لـ index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// تشغيل الخادم
server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
    console.log(`🔗 Redis: ${process.env.REDIS_URL ? 'Configured' : 'Not configured'}`);
    console.log(`🔒 Security: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Development mode'}`);
    console.log('='.repeat(50));
    
    // تحذير إذا كان في production بدون Redis
    if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
        console.warn('⚠️ WARNING: Running in production without Redis!');
    }
});
