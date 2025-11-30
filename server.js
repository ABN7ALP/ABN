// =================================================================
// ملف: server.js (النسخة النهائية والمحسنة)
// =================================================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require("socket.io");

// --- إعداد التطبيق والخادم ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"] // أضف PUT و DELETE للسماح بكل العمليات
  }
});

// --- Middlewares الأساسية ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- جعل io متاحاً لكل الطلبات (هذا صحيح) ---
app.use((req, res, next) => {
    req.io = io;
    next();
});

// --- استدعاء مسارات الـ API ---
const adminRoutes = require('./src/routes/admin.routes');
const offerRoutes = require('./src/routes/offer.routes');
const orderRoutes = require('./src/routes/order.routes');
const serviceRoutes = require('./src/routes/service.routes');
const depositRoutes = require('./src/routes/deposit.routes');
const statsRoutes = require('./src/routes/stats.routes.js');
const authRoutes = require('./src/routes/auth.routes.js');
const notificationRoutes = require('./src/routes/notification.routes');

const PORT = process.env.PORT || 3000;

// --- الاتصال بقاعدة البيانات ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// --- تحديد مسار الملفات الثابتة (public) ---
let publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
  publicPath = path.join(__dirname, '..', 'public');
}
// تقديم الملفات الثابتة (CSS, JS, الصور) من مجلد public
app.use(express.static(publicPath));

// --- مسارات الـ API (يجب أن تكون قبل مسار الواجهة الأمامية) ---
app.use('/api/admin', adminRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('*', (req, res) => {
  // التأكد من أن الطلب ليس لـ API (طبقة حماية إضافية)
  if (req.originalUrl.startsWith('/api/')) {
    // إذا وصل طلب API إلى هنا، فهذا يعني أن المسار غير موجود
    return res.status(404).json({ message: 'API route not found.' });
  }
  // إذا لم يكن طلب API، أرسل ملف الواجهة الأمامية
  res.sendFile(path.join(publicPath, 'index.html'));
});

// --- منطق Socket.IO ---
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// --- تشغيل الخادم ---
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
