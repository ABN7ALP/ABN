// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const { Server } = require('socket.io');
const { checkRedisConnection } = require('./src/services/queue'); // تأكد أن هذه الدالة ترجع Promise<boolean>

// Rate limiters
const {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  generalLimiter
} = require('./src/middleware/rateLimit');

// Routes (تأكد أن المسارات صحيحة)
const adminRoutes = require('./src/routes/admin.routes');
const offerRoutes = require('./src/routes/offer.routes');
const orderRoutes = require('./src/routes/order.routes');
const serviceRoutes = require('./src/routes/service.routes');
const depositRoutes = require('./src/routes/deposit.routes');
const statsRoutes = require('./src/routes/stats.routes');
const authRoutes = require('./src/routes/auth.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const queueRoutes = require('./src/routes/queue.routes');
const supportRoutes = require('./src/routes/support.routes');

const app = express();
app.set('trust proxy', 1);

const server = http.createServer(app);

// ====== Middlewares عامة ======
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// CORS للـ API (تقدر تقيد origin حسب الحاجة)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ====== إعداد Socket.IO (مرة واحدة فقط) ======
let io;
function initSocket(serverInstance) {
  if (io) return io; // إذا تم تهيئته مسبقاً لا تعيد تهيئته
  io = new Server(serverInstance, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST']
    },
    allowEIO3: true
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    // مثال: قراءه userId من query أو من auth
    const userId = socket.handshake.query?.userId;
    if (userId) {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined room: ${userId}`);
    }

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', socket.id, 'reason:', reason);
    });
  });

  return io;
}
initSocket(server);

// دالة للحصول على io من باقي الملفات
const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized yet');
  return io;
};

// نجعل io متاحاً داخل req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ====== ضبط مسارات التطبيق ======
// ضع المسارات الخاصة أولاً قبل تطبيق الـ generalLimiter إن أردت أن تكون محمية أو لا
app.use('/api/admin', adminRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/queue', queueRoutes);

// مهم: ضع مسار الدعم قبل generalLimiter كي لا يُمسك بالـ rate limit العام
app.use('/api/support', supportRoutes);

// الآن ضَع الـ generalLimiter ليشمل بقية مسارات /api
app.use('/api', generalLimiter);

// أمثلة على محددات إضافية للروتات الحسّاسة (لو تريد)
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/auth/verify-email', emailVerificationLimiter);

// ====== Static files (front-end build) ======
let publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
  // في حال مسار البناء واحد مستوى أعلى (monorepo أو docker context)
  publicPath = path.join(__dirname, '..', 'public');
}
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// ====== Health check ======
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
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// إذا كان front-end متاحاً، رُد index.html لكل المسارات غير الـ API
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (fs.existsSync(path.join(publicPath, 'index.html'))) {
    return res.sendFile(path.join(publicPath, 'index.html'));
  }
  return res.status(404).send('Not Found');
});

// ====== Error handler مركزي ======
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || 'Server error'
  });
});

// ====== MongoDB Connection ======
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => {
    console.error('Could not connect to MongoDB:', err);
    // في بيئات الانتاج تقدر هنا توقف السيرفر أو تحاول reconnect
  });

// ====== Redis check مع retry بسيطة ======
async function checkRedisWithRetry(retries = 5, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const ok = await checkRedisConnection();
      if (ok) return true;
    } catch (err) {
      // ignore and retry
    }
    console.log(`Redis connection attempt ${i + 1} failed. Retrying in ${delayMs}ms...`);
    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

setImmediate(async () => {
  const ok = await checkRedisWithRetry(4, 2000);
  if (ok) {
    console.log('✅ تم الاتصال بـ Redis بنجاح');
  } else {
    console.warn('⚠️ فشل الاتصال بـ Redis بعد عدة محاولات. تحقق من REDIS_URL:', process.env.REDIS_URL || 'غير محدد');
  }
});

// ====== Export getIo قبل تحميل أي بوت يعتمد عليه ======
module.exports = { getIo };

// ====== Telegram bot أو أي service يحتاج io ======
// ملاحظة مهمة:
// - إذا ملف telegramBot يستورد `getIo` عبر require('../server') فعادة هذا ينجح طالما نقوم بالاستدعاء بعد module.exports
// - أفضل ممارسات: تعديل telegramBot ليصدّر دالة تقبل getIo كوسيط، مثلاً:
//     module.exports = (getIo) => { /* use getIo() */ }
//   ثم هنا تستدعي: require('./src/services/telegramBot')(getIo);
// Telegram Bot — start after exporting getIo
// ====== Telegram Bot Init ======
try {
    const telegramBotInit = require('./src/services/telegramBot');
    global.telegramBot = telegramBotInit(getIo);
    console.log("Telegram bot initialized successfully.");
} catch (err) {
    console.warn("Failed to initialize Telegram Bot:", err.message);
}

// ====== Start server ======
const PORT = process.env.PORT || 3000;
const serverInstance = server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Redis URL: ${process.env.REDIS_URL ? 'محدد' : 'غير محدد'}`);
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  try {
    serverInstance.close(() => {
      console.log('HTTP server closed.');
    });
    // close mongoose
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    // لو عندك اتصال لـ redis أو queue اغلقه هنا
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
