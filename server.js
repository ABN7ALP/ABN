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
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// اتصال قاعدة البيانات
const MONGODB_URI = "mongodb+srv://ds132z1998_db_user:AL2sG3m1yB6BaoRY@cluster1.ehjwrgc.mongodb.net/smmdb?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
.catch(err => console.error('❌ خطأ في الاتصال:', err));

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

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    quantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    link: { type: String, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['deposit', 'withdrawal', 'order'], required: true },
    description: { type: String },
    status: { type: String, default: 'completed' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Service = mongoose.model('Service', ServiceSchema);
const Order = mongoose.model('Order', OrderSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);

// Middleware للمصادقة
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'الوصول مرفوع' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'smm_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'رمز غير صالح' });
        }
        req.user = user;
        next();
    });
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // التحقق من وجود المستخدم
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ message: 'المستخدم موجود بالفعل' });
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
            { userId: user._id, role: user.role },
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
        res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
    }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // البحث عن المستخدم
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // التحقق من كلمة المرور
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // إنشاء token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
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
        res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
    }
});

// الحصول على الخدمات
app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find({ active: true });
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في جلب الخدمات', error: error.message });
    }
});

// إضافة خدمة جديدة (للمشرف فقط)
app.post('/api/services', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'غير مصرح لك' });
        }

        const service = new Service(req.body);
        await service.save();
        res.status(201).json({ message: 'تم إضافة الخدمة بنجاح', service });
    } catch (error) {
        res.status(500).json({ message: 'خطأ في إضافة الخدمة', error: error.message });
    }
});

// إنشاء طلب جديد
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { serviceId, quantity, link } = req.body;
        
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: 'الخدمة غير موجودة' });
        }

        const user = await User.findById(req.user.userId);
        const totalPrice = service.price * quantity;

        if (user.balance < totalPrice) {
            return res.status(400).json({ message: 'رصيدك غير كافي' });
        }

        // خصم المبلغ من الرصيد
        user.balance -= totalPrice;
        await user.save();

        // إنشاء الطلب
        const order = new Order({
            userId: req.user.userId,
            serviceId,
            quantity,
            totalPrice,
            link
        });

        await order.save();

        // تسجيل المعاملة
        const transaction = new Transaction({
            userId: req.user.userId,
            amount: -totalPrice,
            type: 'order',
            description: `طلب خدمة: ${service.name}`
        });

        await transaction.save();

        // هنا يمكنك إضافة كود لإرسال الطلب إلى الواتساب

        res.status(201).json({ 
            message: 'تم إنشاء الطلب بنجاح',
            order: {
                id: order._id,
                service: service.name,
                quantity,
                totalPrice,
                link,
                status: order.status
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'خطأ في إنشاء الطلب', error: error.message });
    }
});

// شحن الرصيد
app.post('/api/deposit', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findById(req.user.userId);

        user.balance += parseFloat(amount);
        await user.save();

        // تسجيل المعاملة
        const transaction = new Transaction({
            userId: req.user.userId,
            amount: parseFloat(amount),
            type: 'deposit',
            description: 'شحن رصيد'
        });

        await transaction.save();

        res.json({ 
            message: 'تم شحن الرصيد بنجاح',
            newBalance: user.balance 
        });
    } catch (error) {
        res.status(500).json({ message: 'خطأ في شحن الرصيد', error: error.message });
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
        res.status(500).json({ message: 'خطأ في جلب الطلبات', error: error.message });
    }
});

// الحصول على المعاملات
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.userId })
            .sort({ createdAt: -1 });
        
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في جلب المعاملات', error: error.message });
    }
});

// APIs للمشرف
app.get('/api/admin/orders', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'غير مصرح لك' });
        }

        const orders = await Order.find()
            .populate('userId', 'username email')
            .populate('serviceId')
            .sort({ createdAt: -1 });
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في جلب الطلبات', error: error.message });
    }
});

app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'غير مصرح لك' });
        }

        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في جلب المستخدمين', error: error.message });
    }
});

// تحديث حالة الطلب
app.put('/api/admin/orders/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'غير مصرح لك' });
        }

        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('userId serviceId');

        res.json({ message: 'تم تحديث حالة الطلب', order });
    } catch (error) {
        res.status(500).json({ message: 'خطأ في تحديث الطلب', error: error.message });
    }
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`);
});