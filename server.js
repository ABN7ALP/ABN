// ----------------------------------------------------------------
// المرحلة 1: الاستدعاءات والإعدادات الأولية
// ----------------------------------------------------------------
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./src/config/db');
const mongoose = require('mongoose');
const morgan = require('morgan'); // <-- استيراد morgan مباشرة هنا

// ----------------------------------------------------------------
// المرحلة 2: الاتصال بقاعدة البيانات وتسجيل النماذج
// ----------------------------------------------------------------
connectDB();
require('./src/models/User');
require('./src/models/Service');
require('./src/models/Order');
require('./src/models/FundRequest');
require('./src/models/Notification');

// ----------------------------------------------------------------
// المرحلة 3: إنشاء تطبيق Express
// ----------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------------------------------------------------
// المرحلة 4: إعداد الوسائط (MIDDLEWARE) بالترتيب الصحيح
// ----------------------------------------------------------------

// 4.0: نظام التسجيل الشامل (يجب أن يكون أولاً)
// تعريف تنسيق مخصص للتسجيل
morgan.token('body', (req) => JSON.stringify(req.body));
// استخدام morgan للتسجيل مباشرة في الكونسول
app.use(morgan('[:date[iso]] :method :url :status :response-time ms - Body: :body'));

// 4.1: وسائط تحليل الجسم (Body Parsers)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4.2: وسيط الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// 4.3: وسيط الجلسات
app.use(
  session({
    secret: 'bessar-smm-engine-super-secret-key-that-is-long',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGO_URI,
        ttl: 14 * 24 * 60 * 60
    }),
    cookie: { 
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: true,
        sameSite: "none"
    }
  })
);

// 4.4: وسيط مخصص لجلب بيانات المستخدم والإشعارات
app.use(async (req, res, next) => {
    if (req.session.user) {
        const Notification = mongoose.model('Notification');
        const unreadCount = await Notification.countDocuments({ user: req.session.user.id, isRead: false });
        res.locals.unreadNotifications = unreadCount;
        res.locals.user = req.session.user;
    }
    next();
});

// 4.5: إعداد محرك القوالب
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// ----------------------------------------------------------------
// المرحلة 5: استدعاء واستخدام المسارات (ROUTES)
// ----------------------------------------------------------------
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const fundsRoutes = require('./src/routes/fundsRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/orders', orderRoutes);
app.use('/add-funds', fundsRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);
app.use('/notifications', notificationRoutes);

// مسار الصفحة الرئيسية
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('index', { pageTitle: 'الرئيسية' }); 
});

// ----------------------------------------------------------------
// المرحلة 6: تشغيل الخادم
// ----------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`السيرفر يعمل الآن على المنفذ ${PORT}`);
});
