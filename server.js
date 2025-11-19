// 1. استدعاء الحزم المطلوبة
require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./src/config/db');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// استدعاء ملفات المسارات
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
    secret: 'bessar-smm-engine-super-secret-key', // يمكنك تغيير هذا النص
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // صلاحية الجلسة: يوم واحد
    }
  })
);

// تحديد مسار الملفات الثابتة (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// تحديد محرك القوالب (Template Engine)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));


// 4. المسارات (Routes)
app.use('/auth', authRoutes);

// مسار الصفحة الرئيسية
app.get('/', (req, res) => {
  // إذا كان المستخدم مسجلاً دخوله، يمكننا إرساله مباشرة إلى ملفه الشخصي
  if (req.session.user) {
    return res.redirect('/profile');
  }
  // وإلا، نعرض له الصفحة الرئيسية
  res.render('index', { pageTitle: 'الرئيسية' }); 
});

// مسار الملف الشخصي
app.get('/profile', (req, res) => {
    // حماية المسار: التأكد من أن المستخدم مسجل دخوله
    if (!req.session.user) {
        return res.redirect('/auth/login'); 
    }
    // عرض صفحة الملف الشخصي مع تمرير بيانات المستخدم من الجلسة
    res.render('profile', { user: req.session.user });
});


// 5. تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`السيرفر يعمل الآن على المنفذ ${PORT}`);
});
