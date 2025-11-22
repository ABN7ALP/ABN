// استدعاء المكتبات
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const http = require('http'); // <-- استدعاء مكتبة http
const { Server } = require("socket.io"); // <-- استدعاء socket.io

// إعداد التطبيق والخادم
const app = express();
const server = http.createServer(app); // <-- إنشاء خادم http
const io = new Server(server); // <-- ربط socket.io بالخادم

// استدعاء مسارات الطلبات
const orderRoutes = require('./src/routes/order.routes')(io); // <-- تمرير io للمسارات
const serviceRoutes = require('./src/routes/service.routes')(io); // <-- تمرير io للمسارات
const depositRoutes = require('./src/routes/deposit.routes')(io); // <-- تمرير io للمسارات
const statsRoutes = require('./src/routes/stats.routes.js');
const authRoutes = require('./src/routes/auth.routes.js');

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// ... (كود تحديد مسار public يبقى كما هو) ...
let publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
  publicPath = path.join(__dirname, '..', 'public');
}
app.use(express.static(publicPath));

// مسارات الـ API
app.use('/api/orders', orderRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/deposits', depositRoutes);

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

// تشغيل الخادم (نستخدم server.listen بدلاً من app.listen)
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
