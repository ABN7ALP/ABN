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
// يجب أن يحدث هذا قبل تعريف أي مسارات تعتمد على النماذج
connectDB();
require('./src/models/User');
require('./src/models/Service');
require('./src/models/Order');
require('./src/models/FundRequest');

// ----------------------------------------------------------------
// المرحلة 3: إنشاء تطبيق Express
// ----------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------------------------------------------------
// المرحلة 4: إعداد الوسائط (MIDDLEWARE) بالترتيب الصحيح
// ----------------------------------------------------------------

// 4.1: وسائط تحليل الجسم (Body Parsers) - لمعالجة بيانات POST
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4.2: وسيط الملفات الثابتة (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// 4.3: وسيط الجلسات (Session) - هذا يجب أن يكون قبل المسارات
app.use(
  session({
    secret: 'bessar-smm-engine-super-secret-key-that-is-long', // يفضل أن يكون سراً طويلاً
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGO_URI,
        ttl: 14 * 24 * 60 * 60 // مدة الجلسة 14 يوماً
    }),
    cookie: { 
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 يوماً
        httpOnly: true, // زيادة الأمان
    }
  })
);

// 4.4: إعداد محرك القوالب (View Engine)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// ----------------------------------------------------------------
// المرحلة 5: استدعاء واستخدام المسارات (ROUTES)
// ----------------------------------------------------------------
// هذه المرحلة يجب أن تكون بعد إعداد كل الوسائط التي تعتمد عليها

const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const fundsRoutes = require('./src/routes/fundsRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const profileRoutes = require('./src/routes/profileRoutes'); // <-- السطر الجديد الذي تمت إضافته

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/orders', orderRoutes);
app.use('/add-funds', fundsRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes); // <-- السطر الجديد الذي تمت إضافته

// مسار الصفحة الرئيسية (/) - يجب أن يكون من آخر المسارات
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
