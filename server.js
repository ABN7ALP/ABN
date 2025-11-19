// 1. استدعاء الحزم المطلوبة
require('dotenv').config(); // لتفعيل قراءة المتغيرات من ملف .env
const express = require('express');
const path = require('path');

// 2. إعداد تطبيق Express
const app = express();
const PORT = process.env.PORT || 3000;

// 3. إعدادات الوسيط (Middleware)
app.use(express.json()); // للسماح باستقبال بيانات JSON
app.use(express.urlencoded({ extended: true })); // للسماح باستقبال بيانات من النماذج

// تحديد مسار الملفات الثابتة (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// تحديد محرك القوالب (Template Engine)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// 4. المسارات (Routes) الأساسية
// مسار الصفحة الرئيسية
app.get('/', (req, res) => {
  // سنقوم بعرض ملف index.ejs من مجلد src/views
  res.render('index', { pageTitle: 'الرئيسية' }); 
});

// 5. تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`السيرفر يعمل الآن على الرابط http://localhost:${PORT}`);
});
