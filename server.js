const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware مهم
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// خدمة جميع الصفحات HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});

// اتصال قاعدة البيانات
const MONGODB_URI = "mongodb+srv://ds132z1998_db_user:AL2sG3m1yB6BaoRY@cluster1.ehjwrgc.mongodb.net/smmdb?retryWrites=true&w=majority";

console.log('🔄 جاري الاتصال بقاعدة البيانات...');

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
.catch(err => console.error('❌ خطأ في الاتصال:', err.message));

// نماذج قاعدة البيانات
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    role: { type: String, default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const ServiceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    platform: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    minOrder: { type: Number, default: 1 },
    maxOrder: { type: Number, default: 1000 },
    category: { type: String },
    active: { type: Boolean, default: true }
});

const User = mongoose.model('User', UserSchema);
const Service = mongoose.model('Service', ServiceSchema);

// 🔹 APIs الأساسية

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // منع التسجيل كبريد المشرف
        if (email === '11.45') {
            return res.status(400).json({ message: 'لا يمكن استخدام هذا البريد الإلكتروني' });
        }

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
        }

        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ message: 'المستخدم موجود بالفعل' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            email,
            password: hashedPassword,
            role: 'user'
        });

        await user.save();

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            'smm_secret_key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'تم إنشاء الحساب بنجاح',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                role: user.role
            }
        });
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        res.status(500).json({ message: 'خطأ في الخادم' });
    }
});

// تسجيل الدخول - الكود المصحح
app.post('/api/login', async (req, res) => {
    try {
        console.log('🔐 طلب تسجيل دخول:', req.body);
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
        }

        // 🔒 تحقق خاص للمشرف
        if (email === '11.45') {
            if (password === '11.45') {
                // البحث عن مستخدم المشرف أو إنشاؤه
                let adminUser = await User.findOne({ email: '11.45' });
                
                if (!adminUser) {
                    const hashedPassword = await bcrypt.hash('11.45', 10);
                    adminUser = new User({
                        username: 'admin',
                        email: '11.45',
                        password: hashedPassword,
                        role: 'admin',
                        balance: 1000
                    });
                    await adminUser.save();
                    console.log('✅ تم إنشاء المشرف تلقائياً');
                }

                const token = jwt.sign(
                    { userId: adminUser._id, role: adminUser.role },
                    'smm_secret_key',
                    { expiresIn: '24h' }
                );

                console.log('✅ تم تسجيل الدخول كمشرف');
                
                return res.json({
                    message: 'تم تسجيل الدخول كمشرف بنجاح',
                    token,
                    user: {
                        id: adminUser._id,
                        username: adminUser.username,
                        email: adminUser.email,
                        balance: adminUser.balance,
                        role: adminUser.role
                    }
                });
            } else {
                return res.status(400).json({ message: 'كلمة المرور غير صحيحة للمشرف' });
            }
        }

        // 🔐 تسجيل الدخول العادي للمستخدمين
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            'smm_secret_key',
            { expiresIn: '24h' }
        );

        console.log('✅ تم تسجيل الدخول بنجاح:', user.username);
        
        res.json({
            message: 'تم تسجيل الدخول بنجاح',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        res.status(500).json({ message: 'خطأ في الخادم الداخلي' });
    }
});

// الحصول على الخدمات
app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find({ active: true });
        res.json(services);
    } catch (error) {
        console.error('❌ خطأ في جلب الخدمات:', error);
        res.json([]);
    }
});

// API لفحص حالة الخادم
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'running',
        message: 'الخادم يعمل بشكل طبيعي',
        timestamp: new Date().toISOString()
    });
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log('🚀 نظام SMM المتكامل يعمل بنجاح!');
    console.log(`📡 الخادم يعمل على: http://localhost:${PORT}`);
});
