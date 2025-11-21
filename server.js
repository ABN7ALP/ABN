// استدعاء المكتبات
require('dotenv').config(); // لتحميل المتغيرات من ملف .env
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

// استدعاء مسارات الطلبات
const orderRoutes = require('./src/routes/order.routes');

// إعداد التطبيق
const app = express();
const PORT = process.env.PORT || 3000;

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Middlewares
app.use(express.json()); // للسماح باستقبال بيانات JSON
app.use(express.static(path.join(__dirname, 'public'))); // لخدمة الملفات الثابتة (HTML, CSS, JS)

// استخدام المسارات
app.use('/api/orders', orderRoutes);

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
