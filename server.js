const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// حماية متقدمة
app.use(helmet());
app.use(cors());

// معدل الطلبات
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100 // حد 100 طلب لكل IP
});
app.use(limiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// إعدادات رفع الملفات
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/avatars/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('يجب أن يكون الملف صورة!'), false);
        }
    }
});

// اتصال قاعدة البيانات
const MONGODB_URI = "mongodb+srv://ds132z1998_db_user:AL2sG3m1yB6BaoRY@cluster1.ehjwrgc.mongodb.net/smmdb?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
.catch(err => console.error('❌ خطأ في الاتصال:', err));

// نماذج قاعدة البيانات المتقدمة

// نموذج المستخدم المتقدم
const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        minlength: 3,
        maxlength: 30,
        trim: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        validate: [validator.isEmail, 'بريد إلكتروني غير صحيح']
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    avatar: { 
        type: String, 
        default: '/images/default-avatar.png'
    },
    balance: { 
        type: Number, 
        default: 0,
        min: 0
    },
    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'banned'],
        default: 'active'
    },
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incrementLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.update({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }
    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 ساعة
    }
    return this.update(updates);
};

const User = mongoose.model('User', userSchema);

// نموذج الخدمة المتقدم
const serviceSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    description: { 
        type: String, 
        required: true 
    },
    platform: {
        type: String,
        enum: ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'telegram'],
        required: true
    },
    category: { 
        type: String, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true,
        min: 0
    },
    minOrder: { 
        type: Number, 
        default: 100,
        min: 1
    },
    maxOrder: { 
        type: Number, 
        default: 10000,
        min: 1
    },
    speed: { 
        type: String, 
        default: 'متوسط' 
    },
    apiId: { 
        type: String, 
        required: true 
    },
    quality: {
        type: String,
        enum: ['عالية', 'متوسطة', 'منخفضة'],
        default: 'عالية'
    },
    refill: {
        type: Boolean,
        default: false
    },
    status: { 
        type: String, 
        enum: ['active', 'inactive'],
        default: 'active' 
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Service = mongoose.model('Service', serviceSchema);

// نموذج الطلب المتقدم
const orderSchema = new mongoose.Schema({
    orderId: { 
        type: String, 
        unique: true,
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    serviceId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Service', 
        required: true 
    },
    link: { 
        type: String, 
        required: true,
        validate: [validator.isURL, 'رابط غير صحيح']
    },
    quantity: { 
        type: Number, 
        required: true,
        min: 1
    },
    price: { 
        type: Number, 
        required: true,
        min: 0
    },
    status: { 
        type: String, 
        enum: ['pending', 'in progress', 'completed', 'partial', 'cancelled', 'refunded'],
        default: 'pending'
    },
    startCount: { type: Number, default: 0 },
    remains: { type: Number, default: 0 },
    apiOrderId: String,
    adminNotes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// نموذج المعاملة المتقدم
const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        unique: true,
        required: true
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['deposit', 'withdrawal', 'order', 'refund', 'bonus'],
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    method: {
        type: String,
        enum: ['bank', 'shamcash', 'office', 'system', 'order'],
        default: 'system'
    },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    proof: String,
    adminNotes: String,
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// نموذج الإشعارات
const notificationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    title: { 
        type: String, 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error'],
        default: 'info'
    },
    read: { 
        type: Boolean, 
        default: false 
    },
    relatedId: mongoose.Schema.Types.ObjectId,
    relatedType: String,
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// نموذج السجلات
const logSchema = new mongoose.Schema({
    action: { 
        type: String, 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    userIp: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed,
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    createdAt: { type: Date, default: Date.now }
});

const Log = mongoose.model('Log', logSchema);

// Middleware للمصادقة المتقدمة
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'رمز الوصول مطلوب' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smm_pro_secret_key');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(403).json({ error: 'المستخدم غير موجود' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'الحساب غير نشط' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'رمز غير صالح' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح لك' });
    }
    next();
};

// Routes

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes للمصادقة
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // التحقق من البيانات
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
        }

        // التحقق من وجود المستخدم
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ error: 'المستخدم موجود مسبقاً' });
        }

        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 12);

        // إنشاء مستخدم جديد
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // إنشاء token
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'smm_pro_secret_key',
            { expiresIn: '7d' }
        );

        // تسجيل السجل
        await Log.create({
            action: 'USER_REGISTER',
            userId: user._id,
            userIp: req.ip,
            userAgent: req.get('User-Agent'),
            details: { username, email },
            severity: 'low'
        });

        res.status(201).json({
            message: 'تم إنشاء الحساب بنجاح',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                balance: user.balance,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
        }

        // البحث عن المستخدم
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // التحقق من حالة الحساب
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'الحساب غير نشط' });
        }

        // التحقق من كلمة المرور
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            await user.incrementLoginAttempts();
            return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // إعادة تعيين محاولات الدخول
        await user.update({
            $set: { 
                loginAttempts: 0,
                lastLogin: new Date()
            },
            $unset: { lockUntil: 1 }
        });

        // إنشاء token
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'smm_pro_secret_key',
            { expiresIn: '7d' }
        );

        // تسجيل السجل
        await Log.create({
            action: 'USER_LOGIN',
            userId: user._id,
            userIp: req.ip,
            userAgent: req.get('User-Agent'),
            severity: 'low'
        });

        res.json({
            message: 'تم تسجيل الدخول بنجاح',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                balance: user.balance,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// Routes للمستخدمين
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        const unreadNotifications = await Notification.countDocuments({ 
            userId: req.user._id, 
            read: false 
        });
        
        res.json({ ...user.toObject(), unreadNotifications });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

app.put('/api/user/profile', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        const { username, email } = req.body;
        const updateData = { username, email };

        if (req.file) {
            updateData.avatar = '/uploads/avatars/' + req.file.filename;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json({ message: 'تم تحديث الملف الشخصي', user });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// Routes للخدمات
app.get('/api/services', async (req, res) => {
    try {
        const { platform, category, search } = req.query;
        let filter = { status: 'active' };

        if (platform) filter.platform = platform;
        if (category) filter.category = category;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const services = await Service.find(filter).sort({ createdAt: -1 });
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

app.get('/api/services/platforms', async (req, res) => {
    try {
        const platforms = await Service.distinct('platform', { status: 'active' });
        res.json(platforms);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// Routes للطلبات
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { serviceId, link, quantity } = req.body;

        // التحقق من البيانات
        if (!serviceId || !link || !quantity) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }

        // الحصول على الخدمة
        const service = await Service.findById(serviceId);
        if (!service || service.status !== 'active') {
            return res.status(404).json({ error: 'الخدمة غير موجودة' });
        }

        // التحقق من الكمية
        if (quantity < service.minOrder || quantity > service.maxOrder) {
            return res.status(400).json({ 
                error: `الكمية يجب أن تكون بين ${service.minOrder} و ${service.maxOrder}` 
            });
        }

        // الحصول على المستخدم
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        // حساب السعر
        const totalPrice = (service.price * quantity) / 1000;

        // التحقق من الرصيد
        if (user.balance < totalPrice) {
            return res.status(400).json({ error: 'رصيدك غير كافي' });
        }

        // خصم المبلغ من الرصيد
        user.balance -= totalPrice;
        await user.save();

        // إنشاء الطلب
        const order = new Order({
            orderId: `ORD${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
            userId: req.user._id,
            serviceId,
            link,
            quantity,
            price: totalPrice
        });

        await order.save();

        // تسجيل المعاملة
        const transaction = new Transaction({
            transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
            userId: req.user._id,
            type: 'order',
            amount: -totalPrice,
            description: `طلب خدمة: ${service.name}`,
            status: 'completed'
        });

        await transaction.save();

        // إرسال إشعار
        await Notification.create({
            userId: req.user._id,
            title: 'طلب جديد',
            message: `تم إنشاء طلبك #${order.orderId} بنجاح`,
            type: 'success',
            relatedId: order._id,
            relatedType: 'order'
        });

        // إرسال إلى الواتساب
        await sendWhatsAppNotification(order, service, user);

        // تسجيل السجل
        await Log.create({
            action: 'ORDER_CREATE',
            userId: req.user._id,
            userIp: req.ip,
            details: { orderId: order.orderId, service: service.name, amount: totalPrice },
            severity: 'medium'
        });

        res.status(201).json({ 
            message: 'تم إنشاء الطلب بنجاح',
            order: await order.populate('serviceId')
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// دالة إرسال الواتساب
async function sendWhatsAppNotification(order, service, user) {
    try {
        const message = `📦 طلب جديد #${order.orderId}
👤 المستخدم: ${user.username}
📱 الخدمة: ${service.name}
🔗 الرابط: ${order.link}
🔢 الكمية: ${order.quantity}
💰 السعر: $${order.price}
⏰ الوقت: ${new Date().toLocaleString('ar-EG')}

https://wa.me/905367893256?text=طلب%20جديد%20${order.orderId}`;

        // هنا يمكنك استخدام أي خدمة لإرسال الواتساب
        console.log('إرسال إلى الواتساب:', message);
        
        // مثال باستخدام axios لإرسال إلى API
        // await axios.post('WhatsApp-API-URL', {
        //     phone: '905367893256',
        //     message: message
        // });
    } catch (error) {
        console.error('Error sending WhatsApp:', error);
    }
}

// Routes للإشعارات
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        res.json({ message: 'تم标记 الإشعار كمقروء' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// Routes للإيداع
app.post('/api/deposit/request', authenticateToken, async (req, res) => {
    try {
        const { amount, method, proof } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'المبلغ يجب أن يكون أكبر من الصفر' });
        }

        const transaction = new Transaction({
            transactionId: `DEP${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
            userId: req.user._id,
            type: 'deposit',
            amount: amount,
            description: `طلب إيداع عبر ${getMethodName(method)}`,
            method: method,
            proof: proof,
            status: 'pending'
        });

        await transaction.save();

        // إرسال إشعار للأدمن
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            await Notification.create({
                userId: admin._id,
                title: 'طلب إيداع جديد',
                message: `طلب إيداع جديد من ${req.user.username} بمبلغ $${amount}`,
                type: 'info',
                relatedId: transaction._id,
                relatedType: 'transaction'
            });
        }

        res.json({ 
            message: 'تم إرسال طلب الإيداع بنجاح، سيتم المراجعة قريباً',
            transaction 
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

function getMethodName(method) {
    const methods = {
        'bank': 'البنك',
        'shamcash': 'شام كاش',
        'office': 'حوالة مكتب'
    };
    return methods[method] || method;
}

// Routes للأدمن
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [
            totalUsers,
            totalOrders,
            pendingDeposits,
            totalRevenue,
            recentOrders
        ] = await Promise.all([
            User.countDocuments(),
            Order.countDocuments(),
            Transaction.countDocuments({ type: 'deposit', status: 'pending' }),
            Transaction.aggregate([
                { $match: { type: 'deposit', status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Order.find()
                .populate('userId', 'username avatar')
                .populate('serviceId', 'name platform')
                .sort({ createdAt: -1 })
                .limit(10)
        ]);

        res.json({
            totalUsers,
            totalOrders,
            pendingDeposits,
            totalRevenue: totalRevenue[0]?.total || 0,
            recentOrders
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { search, status, page = 1, limit = 10 } = req.query;
        let filter = {};

        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) filter.status = status;

        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(filter);

        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

app.put('/api/admin/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).select('-password');

        // تسجيل السجل
        await Log.create({
            action: 'USER_STATUS_UPDATE',
            userId: req.user._id,
            details: { targetUserId: req.params.id, status },
            severity: 'high'
        });

        res.json({ message: 'تم تحديث حالة المستخدم', user });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

app.get('/api/admin/transactions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { type, status, page = 1, limit = 10 } = req.query;
        let filter = {};

        if (type) filter.type = type;
        if (status) filter.status = status;

        const transactions = await Transaction.find(filter)
            .populate('userId', 'username avatar')
            .populate('verifiedBy', 'username')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Transaction.countDocuments(filter);

        res.json({
            transactions,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

app.put('/api/admin/transactions/:id/verify', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, notes } = req.body;
        const transaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            { 
                status,
                adminNotes: notes,
                verifiedBy: req.user._id,
                verifiedAt: new Date()
            },
            { new: true }
        ).populate('userId', 'username avatar');

        if (status === 'completed' && transaction.type === 'deposit') {
            // إضافة الرصيد للمستخدم
            await User.findByIdAndUpdate(transaction.userId, {
                $inc: { balance: transaction.amount }
            });

            // إرسال إشعار للمستخدم
            await Notification.create({
                userId: transaction.userId._id,
                title: 'تم تأكيد الإيداع',
                message: `تم تأكيد إيداعك بمبلغ $${transaction.amount}`,
                type: 'success',
                relatedId: transaction._id,
                relatedType: 'transaction'
            });
        }

        // تسجيل السجل
        await Log.create({
            action: 'TRANSACTION_VERIFY',
            userId: req.user._id,
            details: { transactionId: req.params.id, status },
            severity: 'medium'
        });

        res.json({ message: 'تم تحديث حالة المعاملة', transaction });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// Routes للصفحات
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user-profile.html'));
});

app.get('/admin/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-profile.html'));
});

app.get('/deposit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'deposit.html'));
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
    console.log(`📊 لوحة الأدمن: http://localhost:${PORT}/admin`);
});
