// استدعاء المكتبات
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// استدعاء مسارات الطلبات
const orderRoutes = require('./src/routes/order.routes');
const serviceRoutes = require('./src/routes/service.routes');
const statsRoutes = require('./src/routes/stats.routes.js');
const authRoutes = require('./src/routes/auth.routes.js');
const depositRoutes = require('./src/routes/deposit.routes.js'); // مسار الإيداع الجديد

// إعداد التطبيق
const app = express();
const PORT = process.env.PORT || 3000;

// زيادة الحد الأقصى لحجم الطلب لاستيعاب الصور (مهم جداً)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// --- حل سحري لتحديد مسار public بشكل ديناميكي ---
let publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
  publicPath = path.join(__dirname, '..', 'public');
}
app.use(express.static(publicPath));
// --- نهاية الحل السحري ---

// مسارات الـ API
app.use('/api/orders', orderRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/deposits', depositRoutes); // استخدام مسار الإيداع

// توجيه كل الطلبات لـ index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
