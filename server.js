const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static('public'));

// اتصال قاعدة البيانات
const MONGODB_URI = "mongodb+srv://ds132z1998_db_user:AL2sG3m1yB6BaoRY@cluster1.ehjwrgc.mongodb.net/smmdb?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
.catch(err => console.error('❌ خطأ في الاتصال:', err));

// نماذج قاعدة البيانات

// نموذج المستخدم
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    role: { type: String, default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// نموذج الخدمة
const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    minOrder: { type: Number, default: 100 },
    maxOrder: { type: Number, default: 10000 },
    speed: { type: String, default: 'متوسط' },
    apiId: { type: String, required: true },
    status: { type: String, default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

const Service = mongoose.model('Service', serviceSchema);

// نموذج الطلب
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    link: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    status: { type: String, default: 'pending' },
    orderId: { type: String, unique: true },
    createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// نموذج المعاملة
const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // deposit, withdrawal, order
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    status: { type: String, default: 'completed' },
    createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Middleware للمصادقة
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'رمز الوصول مطلوب' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'smm_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'رمز غير صالح' });
        }
        req.user = user;
        next();
    });
};

// Routes

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// تسجيل المستخدم
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // التحقق من وجود المستخدم
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ error: 'المستخدم موجود مسبقاً' });
        }

        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);

        // إنشاء مستخدم جديد
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // إنشاء token
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'smm_secret_key',
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
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // البحث عن المستخدم
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // التحقق من كلمة المرور
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // إنشاء token
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'smm_secret_key',
            { expiresIn: '24h' }
        );

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
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// الحصول على الملف الشخصي
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// تحديث الملف الشخصي
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { username, email } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { username, email },
            { new: true }
        ).select('-password');
        
        res.json({ message: 'تم تحديث الملف الشخصي', user });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// الحصول على الخدمات
app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find({ status: 'active' });
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// إضافة خدمة جديدة (لأدمن فقط)
app.post('/api/services', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'غير مصرح لك' });
        }

        const service = new Service(req.body);
        await service.save();
        res.status(201).json({ message: 'تم إضافة الخدمة', service });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// إنشاء طلب جديد
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { serviceId, link, quantity } = req.body;

        // الحصول على الخدمة
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ error: 'الخدمة غير موجودة' });
        }

        // الحصول على المستخدم
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        // حساب السعر
        const totalPrice = service.price * quantity;

        // التحقق من الرصيد
        if (user.balance < totalPrice) {
            return res.status(400).json({ error: 'رصيدك غير كافي' });
        }

        // خصم المبلغ من الرصيد
        user.balance -= totalPrice;
        await user.save();

        // إنشاء الطلب
        const order = new Order({
            userId: req.user.userId,
            serviceId,
            link,
            quantity,
            price: totalPrice,
            orderId: `ORD${Date.now()}`
        });

        await order.save();

        // تسجيل المعاملة
        const transaction = new Transaction({
            userId: req.user.userId,
            type: 'order',
            amount: -totalPrice,
            description: `طلب خدمة: ${service.name}`
        });

        await transaction.save();

        // هنا يمكنك إضافة كود لإرسال الطلب إلى الواتساب

        res.status(201).json({ 
            message: 'تم إنشاء الطلب بنجاح',
            order 
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// الحصول على طلبات المستخدم
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.userId })
            .populate('serviceId')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// شحن الرصيد
app.post('/api/deposit', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;

        if (amount <= 0) {
            return res.status(400).json({ error: 'المبلغ يجب أن يكون أكبر من الصفر' });
        }

        const user = await User.findById(req.user.userId);
        user.balance += amount;
        await user.save();

        // تسجيل المعاملة
        const transaction = new Transaction({
            userId: req.user.userId,
            type: 'deposit',
            amount: amount,
            description: `شحن رصيد بمبلغ: ${amount}`
        });

        await transaction.save();

        res.json({ 
            message: 'تم شحن الرصيد بنجاح',
            newBalance: user.balance 
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// الحصول على المعاملات
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.userId })
            .sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// إحصائيات الأدمن
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'غير مصرح لك' });
        }

        const totalUsers = await User.countDocuments();
        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Transaction.aggregate([
            { $match: { type: 'deposit' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const recentOrders = await Order.find()
            .populate('userId', 'username')
            .populate('serviceId', 'name')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            totalUsers,
            totalOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            recentOrders
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// Routes للصفحات
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
});
