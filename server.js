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

// إعداد التطبيق
const app = express();
const PORT = process.env.PORT || 3000;

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

app.use(express.json());

// --- حل سحري لتحديد مسار public بشكل ديناميكي ---
let publicPath = path.join(__dirname, 'public'); // افتراضياً
if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
  // إذا الملف مش موجود، حاول نرجع خطوة لورا
  publicPath = path.join(__dirname, '..', 'public');
}

app.use(express.static(publicPath));
// --- نهاية الحل السحري ---

// مسارات الـ API
app.use('/api/orders', orderRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/stats', statsRoutes);

// توجيه كل الطلبات لـ index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
