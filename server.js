// استدعاء المكتبات
require('dotenv').config(); // لتحميل المتغيرات من ملف .env
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

// استدعاء مسارات الطلبات (API routes)
const orderRoutes = require('./src/routes/order.routes');

// إعداد التطبيق
const app = express();
const PORT = process.env.PORT || 3000;

// الاتصال بقاعدة البيانات
// تأكد من أن متغير MONGODB_URI مُعرَّف في بيئة Render
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Middlewares (برمجيات وسيطة)
// للسماح باستقبال بيانات بصيغة JSON من الواجهة الأمامية
app.use(express.json()); 
// لخدمة الملفات الثابتة (HTML, CSS, JS) من مجلد 'public'
app.use(express.static(path.join(__dirname, 'public'))); 

// استخدام مسارات الـ API
// أي طلب يبدأ بـ /api/orders سيتم توجيهه إلى orderRoutes
app.use('/api/orders', orderRoutes);

// توجيه جميع الطلبات الأخرى إلى الواجهة الأمامية (index.html)
// هذا السطر هو الحل لمشكلة "Cannot GET /"
// يجب أن يكون هذا السطر بعد تعريف مسارات الـ API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
