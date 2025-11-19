// 1. استدعاء الحزم المطلوبة
require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./src/config/db');

// استدعاء ملف المسارات الجديد
const authRoutes = require('./src/routes/authRoutes'); // <-- إضافة جديدة

// الاتصال بقاعدة البيانات
connectDB();

// 2. إعداد تطبيق Express
const app = express();
const PORT = process.env.PORT || 3000;

// 3. إعدادات الوسيط (Middleware)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// 4. المسارات (Routes)
// استخدام مسارات المصادقة مع البادئة /auth
app.use('/auth', authRoutes); // <-- إضافة جديدة

// مسار الصفحة الرئيسية
app.get('/', (req, res) => {
  res.render('index', { pageTitle: 'الرئيسية' }); 
});

// 5. تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`السيرفر يعمل الآن على الرابط http://localhost:${PORT}`);
});
