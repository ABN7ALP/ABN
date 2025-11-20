// ----------------------------------------------------------------
// المرحلة 1: الاستدعاءات والإعدادات الأولية
// ----------------------------------------------------------------
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./src/config/db');

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
// المرحلة 4: إعداد الوسائط (MIDDLEWARE)
// ----------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
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
    }
  })
);

// وسيط مخصص لجلب الإشعارات وإضافتها إلى كل الصفحات
const Notification = mongoose.model('Notification');
app.use(async (req, res, next) => {
    if (req.session.user) {
        const unreadCount = await Notification.countDocuments({ user: req.session.user.id, isRead: false });
        res.locals.unreadNotifications = unreadCount;
        res.locals.user = req.session.user; // جعل بيانات المستخدم متاحة لكل القوالب
    }
    next();
});

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
const notificationRoutes = require('./src/routes/notificationRoutes'); // <-- السطر الجديد

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/orders', orderRoutes);
app.use('/add-funds', fundsRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);
app.use('/notifications', notificationRoutes); // <-- السطر الجديد

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
