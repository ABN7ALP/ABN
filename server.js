// استدعاء المكتبات
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

// استدعاء مسارات الطلبات (API routes)
const orderRoutes = require('./src/routes/order.routes');

// إعداد التطبيق
const app = express();
const PORT = process.env.PORT || 3000;

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Middlewares (برمجيات وسيطة)
app.use(express.json());

// --- التعديل الرئيسي هنا ---
// تحديد المسار الصحيح لمجلد 'public' بشكل صريح
const publicPath = path.join(__dirname, '..', 'public');
// في حال فشل المسار الأول (للتوافق مع التشغيل المحلي)، استخدم المسار المباشر
const publicPathFallback = path.join(__dirname, 'public');

// استخدم المسار الصحيح لخدمة الملفات
app.use(express.static(publicPathFallback));
// --- نهاية التعديل ---


// استخدام مسارات الـ API
app.use('/api/orders', orderRoutes);

// توجيه جميع الطلبات الأخرى إلى الواجهة الأمامية (index.html)
app.get('*', (req, res) => {
  // استخدم نفس المسار الاحتياطي هنا أيضاً
  res.sendFile(path.join(publicPathFallback, 'index.html'));
});

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
