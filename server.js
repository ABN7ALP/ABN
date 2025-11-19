// 1. استدعاء الحزم المطلوبة
require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./src/config/db');
const session = require('express-session'); // <-- إضافة جديدة
const MongoStore = require('connect-mongo'); // <-- إضافة جديدة

// استدعاء ملف المسارات
const authRoutes = require('./src/routes/authRoutes');

// الاتصال بقاعدة البيانات
connectDB();

// 2. إعداد تطبيق Express
const app = express();
const PORT = process.env.PORT || 3000;

// 3. إعدادات الوسيط (Middleware)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// إعداد الجلسات (Sessions) - يجب أن يكون قبل المسارات
app.use(
  session({
    secret: 'a secret key for smm engine', // <-- غير هذا النص إلى أي جملة سرية من اختيارك
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // صلاحية الجلسة: يوم واحد
    }
  })
); // <-- إضافة جديدة

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// 4. المسارات (Routes)
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.render('index', { pageTitle: 'الرئيسية' }); 
});

// 5. تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`السيرفر يعمل الآن على المنفذ ${PORT}`);
});
