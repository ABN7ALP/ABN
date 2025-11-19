// 1. استدعاء الحزم المطلوبة
require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./src/config/db');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// استدعاء ملفات المسارات
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const orderRoutes = require('./src/routes/orderRoutes'); // <-- إضافة جديدة

// الاتصال بقاعدة البيانات
connectDB();

// 2. إعداد تطبيق Express
const app = express();
const PORT = process.env.PORT || 3000;

// 3. إعدادات الوسيط (Middleware)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'bessar-smm-engine-super-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  })
);

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// 4. المسارات (Routes)
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/orders', orderRoutes); // <-- إضافة جديدة

// مسار الصفحة الرئيسية (/)
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('index', { pageTitle: 'الرئيسية' }); 
});

// مسار الملف الشخصي (يمكن تطويره لاحقاً)
app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login'); 
    }
    res.send(`<h1>صفحة الملف الشخصي للمستخدم: ${req.session.user.name} (سيتم تطويرها)</h1>`);
});

// 5. تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`السيرفر يعمل الآن على المنفذ ${PORT}`);
});
