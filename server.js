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

// ==================== MIDDLEWARES الأساسية ====================
app.use(helmet());
app.use(cors());

// Rate Limiting العام
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 1000, // حد 1000 طلب لكل IP
    message: {
        success: false,
        error: 'عدد الطلبات كبير جداً، يرجى المحاولة لاحقاً',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});
app.use(generalLimiter);

// Middleware للبيانات
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// ==================== MIDDLEWARES مخصصة ====================

// Middleware للمصادقة
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: 'رمز الوصول مطلوب',
            code: 'TOKEN_REQUIRED'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'smm_pro_secret_key', (err, decoded) => {
        if (err) {
            return res.status(403).json({ 
                success: false,
                error: 'رمز الوصول غير صالح أو منتهي الصلاحية',
                code: 'INVALID_TOKEN'
            });
        }

        req.user = decoded;
        next();
    });
};

// Middleware للتحقق من أن المستخدم مفعل
const requireActiveUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'المستخدم غير موجود',
                code: 'USER_NOT_FOUND'
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ 
                success: false,
                error: 'الحساب غير نشط. يرجى التواصل مع الدعم',
                code: 'ACCOUNT_SUSPENDED'
            });
        }

        req.currentUser = user;
        next();
    } catch (error) {
        console.error('Error in requireActiveUser:', error);
        return res.status(500).json({ 
            success: false,
            error: 'خطأ في التحقق من حالة المستخدم',
            code: 'SERVER_ERROR'
        });
    }
};

// Middleware للتحقق من صلاحيات الأدمن
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            error: 'غير مصرح لك. تحتاج صلاحيات أدمن',
            code: 'ADMIN_REQUIRED'
        });
    }
    next();
};

// Middleware للتحقق من صلاحيات المستخدم العادي
const requireUser = (req, res, next) => {
    if (!req.user || req.user.role !== 'user') {
        return res.status(403).json({ 
            success: false,
            error: 'غير مصرح لك',
            code: 'USER_REQUIRED'
        });
    }
    next();
};

// Middleware للتحقق من ملكية البيانات
const requireOwnership = (req, res, next) => {
    const requestedUserId = req.params.userId || req.body.userId;
    
    if (req.user.role !== 'admin' && req.user.userId !== requestedUserId) {
        return res.status(403).json({ 
            success: false,
            error: 'غير مصرح لك للوصول إلى هذه البيانات',
            code: 'OWNERSHIP_REQUIRED'
        });
    }
    next();
};

// Middleware للتحقق من الحدود القصوى للطلبات
const checkOrderLimits = async (req, res, next) => {
    try {
        const { quantity, serviceId } = req.body;
        
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ 
                success: false,
                error: 'الخدمة غير موجودة',
                code: 'SERVICE_NOT_FOUND'
            });
        }

        if (quantity < service.minOrder) {
            return res.status(400).json({ 
                success: false,
                error: `الحد الأدنى للطلب هو ${service.minOrder}`,
                code: 'MIN_ORDER_LIMIT'
            });
        }

        if (quantity > service.maxOrder) {
            return res.status(400).json({ 
                success: false,
                error: `الحد الأقصى للطلب هو ${service.maxOrder}`,
                code: 'MAX_ORDER_LIMIT'
            });
        }

        req.service = service;
        next();
    } catch (error) {
        console.error('Error in checkOrderLimits:', error);
        return res.status(500).json({ 
            success: false,
            error: 'خطأ في التحقق من حدود الطلب',
            code: 'SERVER_ERROR'
        });
    }
};

// Middleware للتحقق من الرصيد الكافي
const checkBalance = async (req, res, next) => {
    try {
        const { quantity } = req.body;
        
        const user = await User.findById(req.user.userId);
        const totalPrice = (req.service.price * quantity) / 1000;

        if (user.balance < totalPrice) {
            return res.status(400).json({ 
                success: false,
                error: 'رصيدك غير كافي',
                required: totalPrice,
                current: user.balance,
                code: 'INSUFFICIENT_BALANCE'
            });
        }

        req.totalPrice = totalPrice;
        req.userData = user;
        next();
    } catch (error) {
        console.error('Error in checkBalance:', error);
        return res.status(500).json({ 
            success: false,
            error: 'خطأ في التحقق من الرصيد',
            code: 'SERVER_ERROR'
        });
    }
};

// Middleware للتحقق من صحة الرابط
const validateLink = (req, res, next) => {
    const { link, serviceId } = req.body;

    if (!link) {
        return res.status(400).json({ 
            success: false,
            error: 'الرابط مطلوب',
            code: 'LINK_REQUIRED'
        });
    }

    if (!validator.isURL(link)) {
        return res.status(400).json({ 
            success: false,
            error: 'الرابط غير صحيح',
            code: 'INVALID_LINK'
        });
    }

    next();
};

// Middleware للتحقق من حالة الخدمة
const checkServiceStatus = async (req, res, next) => {
    try {
        const { serviceId } = req.body;
        
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ 
                success: false,
                error: 'الخدمة غير موجودة',
                code: 'SERVICE_NOT_FOUND'
            });
        }

        if (service.status !== 'active') {
            return res.status(400).json({ 
                success: false,
                error: 'الخدمة غير متاحة حالياً',
                code: 'SERVICE_INACTIVE'
            });
        }

        req.service = service;
        next();
    } catch (error) {
        console.error('Error in checkServiceStatus:', error);
        return res.status(500).json({ 
            success: false,
            error: 'خطأ في التحقق من حالة الخدمة',
            code: 'SERVER_ERROR'
        });
    }
};

// ==================== RATE LIMITERS مخصصة ====================

const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ساعة
    max: 5, // حد 5 محاولات لكل IP
    message: {
        success: false,
        error: 'تم إنشاء الكثير من الحسابات من هذا العنوان، يرجى المحاولة بعد ساعة',
        code: 'ACCOUNT_CREATION_LIMIT'
    }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 10, // حد 10 محاولات دخول
    message: {
        success: false,
        error: 'عدد كبير من محاولات الدخول، يرجى المحاولة بعد 15 دقيقة',
        code: 'LOGIN_ATTEMPTS_LIMIT'
    }
});

const orderLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 دقيقة
    max: 10, // حد 10 طلبات في الدقيقة
    message: {
        success: false,
        error: 'عدد كبير من الطلبات، يرجى الانتظار قليلاً',
        code: 'ORDER_RATE_LIMIT'
    }
});

const depositLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 دقائق
    max: 5, // حد 5 طلبات إيداع
    message: {
        success: false,
        error: 'عدد كبير من طلبات الإيداع، يرجى الانتظار 10 دقائق',
        code: 'DEPOSIT_RATE_LIMIT'
    }
});

// ==================== إعدادات رفع الملفات ====================
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

// ==================== اتصال قاعدة البيانات ====================
const MONGODB_URI = "mongodb+srv://ds132z1998_db_user:AL2sG3m1yB6BaoRY@cluster1.ehjwrgc.mongodb.net/smmdb?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
.catch(err => console.error('❌ خطأ في الاتصال:', err));

// ==================== نماذج قاعدة البيانات ====================

// نموذج المستخدم
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
        validate: {
            validator: function(v) {
                return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
            },
            message: 'بريد إلكتروني غير صحيح'
        }
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
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }
    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
    }
    return this.updateOne(updates);
};

const User = mongoose.model('User', userSchema);

// نموذج الخدمة
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

// نموذج الطلب
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
        validate: {
            validator: function(v) {
                return validator.isURL(v);
            },
            message: 'رابط غير صحيح'
        }
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

// نموذج المعاملة
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

// ==================== ROUTES مع Middlewares ====================

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🔐 Routes المصادقة مع Rate Limiting
app.post('/api/register', createAccountLimiter, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'جميع الحقول مطلوبة',
                code: 'MISSING_FIELDS'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false,
                error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
                code: 'PASSWORD_TOO_SHORT'
            });
        }

        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                error: 'المستخدم موجود مسبقاً',
                code: 'USER_EXISTS'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'smm_pro_secret_key',
            { expiresIn: '7d' }
        );

        await Log.create({
            action: 'USER_REGISTER',
            userId: user._id,
            userIp: req.ip,
            userAgent: req.get('User-Agent'),
            details: { username, email },
            severity: 'low'
        });

        res.status(201).json({
            success: true,
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
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'البريد الإلكتروني وكلمة المرور مطلوبان',
                code: 'MISSING_CREDENTIALS'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ 
                success: false,
                error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
                code: 'INVALID_CREDENTIALS'
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ 
                success: false,
                error: 'الحساب غير نشط',
                code: 'ACCOUNT_SUSPENDED'
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            await user.incrementLoginAttempts();
            return res.status(400).json({ 
                success: false,
                error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
                code: 'INVALID_CREDENTIALS'
            });
        }

        await user.updateOne({
            $set: { 
                loginAttempts: 0,
                lastLogin: new Date()
            },
            $unset: { lockUntil: 1 }
        });

        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'smm_pro_secret_key',
            { expiresIn: '7d' }
        );

        await Log.create({
            action: 'USER_LOGIN',
            userId: user._id,
            userIp: req.ip,
            userAgent: req.get('User-Agent'),
            severity: 'low'
        });

        res.json({
            success: true,
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
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

// 👤 Routes المستخدم مع المصادقة
app.get('/api/user/profile', authenticateToken, requireActiveUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        const unreadNotifications = await Notification.countDocuments({ 
            userId: req.user.userId, 
            read: false 
        });
        
        res.json({
            success: true,
            ...user.toObject(),
            unreadNotifications
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

app.put('/api/user/profile', authenticateToken, requireActiveUser, upload.single('avatar'), async (req, res) => {
    try {
        const { username, email } = req.body;
        const updateData = { username, email };

        if (req.file) {
            updateData.avatar = '/uploads/avatars/' + req.file.filename;
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json({ 
            success: true,
            message: 'تم تحديث الملف الشخصي', 
            user 
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

// 📦 Routes الخدمات
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
        res.json({
            success: true,
            services
        });
    } catch (error) {
        console.error('Services error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

app.get('/api/services/platforms', async (req, res) => {
    try {
        const platforms = await Service.distinct('platform', { status: 'active' });
        res.json({
            success: true,
            platforms
        });
    } catch (error) {
        console.error('Platforms error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

// 🛒 Routes الطلبات مع جميع Middlewares
app.post('/api/orders', 
    authenticateToken, 
    requireActiveUser,
    validateLink,
    checkServiceStatus,
    checkOrderLimits,
    checkBalance,
    orderLimiter,
    async (req, res) => {
    try {
        const { serviceId, link, quantity } = req.body;

        const user = await User.findById(req.user.userId);
        
        // خصم المبلغ من الرصيد
        user.balance -= req.totalPrice;
        await user.save();

        // إنشاء الطلب
        const order = new Order({
            orderId: `ORD${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
            userId: req.user.userId,
            serviceId,
            link,
            quantity,
            price: req.totalPrice
        });

        await order.save();

        // تسجيل المعاملة
        const transaction = new Transaction({
            transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
            userId: req.user.userId,
            type: 'order',
            amount: -req.totalPrice,
            description: `طلب خدمة: ${req.service.name}`,
            status: 'completed'
        });

        await transaction.save();

        // إرسال إشعار
        await Notification.create({
            userId: req.user.userId,
            title: 'طلب جديد',
            message: `تم إنشاء طلبك #${order.orderId} بنجاح`,
            type: 'success',
            relatedId: order._id,
            relatedType: 'order'
        });

        // إرسال إلى الواتساب
        await sendWhatsAppNotification(order, req.service, user);

        // تسجيل السجل
        await Log.create({
            action: 'ORDER_CREATE',
            userId: req.user.userId,
            userIp: req.ip,
            details: { 
                orderId: order.orderId, 
                service: req.service.name, 
                amount: req.totalPrice 
            },
            severity: 'medium'
        });

        const populatedOrder = await order.populate('serviceId');

        res.status(201).json({ 
            success: true,
            message: 'تم إنشاء الطلب بنجاح',
            order: populatedOrder
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
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

        console.log('إرسال إلى الواتساب:', message);
        
        // هنا يمكنك إضافة كود API حقيقي لإرسال الواتساب
    } catch (error) {
        console.error('Error sending WhatsApp:', error);
    }
}

app.get('/api/orders', authenticateToken, requireActiveUser, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.userId })
            .populate('serviceId')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            orders
        });
    } catch (error) {
        console.error('Orders error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

// 💰 Routes الإيداع
app.post('/api/deposit/request', 
    authenticateToken, 
    requireActiveUser, 
    depositLimiter,
    async (req, res) => {
    try {
        const { amount, method, proof } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'المبلغ يجب أن يكون أكبر من الصفر',
                code: 'INVALID_AMOUNT'
            });
        }

        const minDeposit = 1;
        const maxDeposit = 10000;

        if (amount < minDeposit) {
            return res.status(400).json({ 
                success: false,
                error: `الحد الأدنى للإيداع هو $${minDeposit}`,
                code: 'MIN_DEPOSIT_LIMIT'
            });
        }

        if (amount > maxDeposit) {
            return res.status(400).json({ 
                success: false,
                error: `الحد الأقصى للإيداع هو $${maxDeposit}`,
                code: 'MAX_DEPOSIT_LIMIT'
            });
        }

        const transaction = new Transaction({
            transactionId: `DEP${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
            userId: req.user.userId,
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
                message: `طلب إيداع جديد من ${req.currentUser.username} بمبلغ $${amount}`,
                type: 'info',
                relatedId: transaction._id,
                relatedType: 'transaction'
            });
        }

        await Log.create({
            action: 'DEPOSIT_REQUEST',
            userId: req.user.userId,
            userIp: req.ip,
            details: { amount, method, transactionId: transaction.transactionId },
            severity: 'medium'
        });

        res.json({ 
            success: true,
            message: 'تم إرسال طلب الإيداع بنجاح، سيتم المراجعة قريباً',
            transaction 
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
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

// 🔔 Routes الإشعارات
app.get('/api/notifications', authenticateToken, requireActiveUser, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(20);
        
        res.json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

app.put('/api/notifications/:id/read', authenticateToken, requireActiveUser, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        
        res.json({ 
            success: true,
            message: 'تم标记 الإشعار كمقروء' 
        });
    } catch (error) {
        console.error('Notification read error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

// 👑 Routes الأدمن مع التحقق من الصلاحيات
app.get('/api/admin/stats', 
    authenticateToken, 
    requireAdmin,
    async (req, res) => {
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

        await Log.create({
            action: 'ADMIN_STATS_ACCESS',
            userId: req.user.userId,
            userIp: req.ip,
            severity: 'low'
        });

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalOrders,
                pendingDeposits,
                totalRevenue: totalRevenue[0]?.total || 0,
                recentOrders
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

app.get('/api/admin/users', 
    authenticateToken, 
    requireAdmin,
    async (req, res) => {
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

        await Log.create({
            action: 'ADMIN_USERS_ACCESS',
            userId: req.user.userId,
            userIp: req.ip,
            details: { search, status, page, limit },
            severity: 'medium'
        });

        res.json({
            success: true,
            users,
            pagination: {
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                total
            }
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

app.put('/api/admin/users/:id/status', 
    authenticateToken, 
    requireAdmin,
    async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).select('-password');

        await Log.create({
            action: 'USER_STATUS_UPDATE',
            userId: req.user.userId,
            details: { 
                targetUserId: req.params.id, 
                status,
                adminId: req.user.userId
            },
            severity: 'high'
        });

        res.json({ 
            success: true,
            message: 'تم تحديث حالة المستخدم', 
            user 
        });
    } catch (error) {
        console.error('User status update error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

app.get('/api/admin/transactions', 
    authenticateToken, 
    requireAdmin,
    async (req, res) => {
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

        await Log.create({
            action: 'ADMIN_TRANSACTIONS_ACCESS',
            userId: req.user.userId,
            userIp: req.ip,
            details: { type, status, page, limit },
            severity: 'medium'
        });

        res.json({
            success: true,
            transactions,
            pagination: {
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                total
            }
        });
    } catch (error) {
        console.error('Admin transactions error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
    }
});

app.put('/api/admin/transactions/:id/verify', 
    authenticateToken, 
    requireAdmin,
    async (req, res) => {
    try {
        const { status, notes } = req.body;
        const transaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            { 
                status,
                adminNotes: notes,
                verifiedBy: req.user.userId,
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

        await Log.create({
            action: 'TRANSACTION_VERIFY',
            userId: req.user.userId,
            details: { 
                transactionId: req.params.id, 
                status,
                amount: transaction.amount
            },
            severity: 'medium'
        });

        res.json({ 
            success: true,
            message: 'تم تحديث حالة المعاملة', 
            transaction 
        });
    } catch (error) {
        console.error('Transaction verify error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر',
            code: 'SERVER_ERROR'
        });
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

// Route لخدمة الملفات الثابتة للصور
app.use('/uploads', express.static('uploads'));

// Route لمعالجة الأخطاء 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'الصفحة غير موجودة',
        code: 'PAGE_NOT_FOUND'
    });
});

// Middleware لمعالجة الأخطاء العامة
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    res.status(500).json({
        success: false,
        error: 'حدث خطأ غير متوقع في السيرفر',
        code: 'INTERNAL_SERVER_ERROR'
    });
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
    console.log(`📊 لوحة الأدمن: http://localhost:${PORT}/admin`);
    console.log(`👤 لوحة المستخدم: http://localhost:${PORT}/dashboard`);
});
