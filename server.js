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

// خدمة الملفات الثابتة للصفحات بنفس الاسم
app.get('/:page', (req, res) => {
    const page = req.params.page;
    if (fs.existsSync(path.join(__dirname, page))) {
        res.sendFile(path.join(__dirname, page));
    } else {
        res.status(404).send('الصفحة غير موجودة');
    }
});

// اتصال قاعدة البيانات مع معالجة الأخطاء
const MONGODB_URI = "mongodb+srv://ds132z1998_db_user:AL2sG3m1yB6BaoRY@cluster1.ehjwrgc.mongodb.net/smmdb?retryWrites=true&w=majority";

console.log('🔄 جاري الاتصال بقاعدة البيانات...');

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(() => {
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
})
.catch(err => {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
    console.log('⚠️  النظام سيعمل بدون قاعدة البيانات - يمكنك تجربة الواجهة فقط');
});

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

// بيانات تجريبية للخدمات
const sampleServices = [
    {
        name: 'متابعين انستجرام',
        platform: 'Instagram',
        description: 'متابعين حقيقيين بجودة عالية',
        price: 0.50,
        minOrder: 100,
        maxOrder: 10000
    },
    {
        name: 'لايكات فيسبوك',
        platform: 'Facebook',
        description: 'لايكات حقيقية للصفحات والمنشورات',
        price: 0.20,
        minOrder: 50,
        maxOrder: 5000
    },
    {
        name: 'مشاهدات يوتيوب',
        platform: 'YouTube',
        description: 'مشاهدات عالية الجودة',
        price: 0.10,
        minOrder: 1000,
        maxOrder: 100000
    },
    {
        name: 'متابعين تويتر',
        platform: 'Twitter',
        description: 'متابعين نشطين',
        price: 0.80,
        minOrder: 100,
        maxOrder: 5000
    },
    {
        name: 'لايكات تيك توك',
        platform: 'TikTok',
        description: 'لايكات سريعة وجودة عالية',
        price: 0.15,
        minOrder: 100,
        maxOrder: 10000
    },
    {
        name: 'مشتركين تليجرام',
        platform: 'Telegram',
        description: 'مشتركين حقيقيين للقنوات',
        price: 1.00,
        minOrder: 100,
        maxOrder: 10000
    }
];

// إنشاء خدمات تجريبية تلقائياً
async function createSampleServices() {
    try {
        const serviceCount = await Service.countDocuments();
        if (serviceCount === 0) {
            await Service.insertMany(sampleServices);
            console.log('✅ تم إنشاء الخدمات التجريبية بنجاح');
        }
    } catch (error) {
        console.log('⚠️  لم يتم إنشاء الخدمات التجريبية:', error.message);
    }
}

// استدعاء الدوال بعد الاتصال بقاعدة البيانات
mongoose.connection.once('open', async () => {
    await createSampleServices();
});

// Middleware للمصادقة
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'الوصول مرفوع' });
    }

    jwt.verify(token, 'smm_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'رمز غير صالح' });
        }
        req.user = user;
        next();
    });
};

// 🔹 APIs الأساسية

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
    try {
        console.log('📝 طلب تسجيل جديد:', req.body);
        const { username, email, password } = req.body;

        // 🔒 منع التسجيل كبريد المشرف
        if (email === '11.45') {
            return res.status(400).json({ message: 'لا يمكن استخدام هذا البريد الإلكتروني' });
        }

        // تحقق بسيط من البيانات
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
            role: 'user' // ⚠️ جميع المستخدمين الجدد يكونوا عاديين
        });

        await user.save();

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            'smm_secret_key',
            { expiresIn: '24h' }
        );

        console.log('✅ تم إنشاء حساب جديد:', username);
        
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
        res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
    }
});

// تسجيل الدخول
// تسجيل الدخول - الكود المصحح
app.post('/api/login', async (req, res) => {
    try {
        console.log('🔐 طلب تسجيل دخول:', req.body);
        
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
        }

        console.log('📧 البريد المدخل:', email);

        // 🔒 تحقق خاص للمشرف
        if (email === '11.45') {
            console.log('🎯 تم التعرف على محاولة دخول مشرف');
            
            if (password === '11.45') {
                console.log('🔑 كلمة المرور صحيحة للمشرف');
                
                try {
                    // البحث عن مستخدم المشرف
                    let adminUser = await User.findOne({ email: '11.45' });
                    
                    if (!adminUser) {
                        console.log('👤 محاولة إنشاء مشرف جديد');
                        
                        // جرب أسماء مستخدمين مختلفة إذا كان "admin" مستخدم
                        let username = 'admin';
                        let counter = 1;
                        
                        while (await User.findOne({ username })) {
                            username = `admin${counter}`;
                            counter++;
                            if (counter > 10) {
                                throw new Error('لا يمكن إنشاء مشرف - جميع الأسماء محجوزة');
                            }
                        }
                        
                        console.log('✅ سيتم استخدام اسم المستخدم:', username);
                        
                        const hashedPassword = await bcrypt.hash('11.45', 10);
                        adminUser = new User({
                            username: username,
                            email: '11.45',
                            password: hashedPassword,
                            role: 'admin',
                            balance: 1000
                        });
                        
                        await adminUser.save();
                        console.log('✅ تم إنشاء المشرف بنجاح باسم:', username);
                    } else {
                        console.log('✅ تم العثور على المشرف الموجود:', adminUser.username);
                    }

                    const token = jwt.sign(
                        { userId: adminUser._id, role: adminUser.role },
                        'smm_secret_key',
                        { expiresIn: '24h' }
                    );

                    console.log('✅ تم تسجيل الدخول كمشرف بنجاح');
                    
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

                } catch (adminError) {
                    console.error('❌ خطأ في عملية المشرف:', adminError.message);
                    
                    // إذا كان الخطأ بسبب اسم مستخدم مكرر، حاول تجاوزه
                    if (adminError.code === 11000) {
                        console.log('🔄 محاولة إصلاح الخطأ...');
                        
                        // جرب العثور على المشرف بأي طريقة
                        const existingAdmin = await User.findOne({ 
                            $or: [
                                { email: '11.45' },
                                { role: 'admin' }
                            ] 
                        });
                        
                        if (existingAdmin) {
                            console.log('✅ تم العثور على مشرف موجود:', existingAdmin.username);
                            
                            const token = jwt.sign(
                                { userId: existingAdmin._id, role: existingAdmin.role },
                                'smm_secret_key',
                                { expiresIn: '24h' }
                            );
                            
                            return res.json({
                                message: 'تم تسجيل الدخول كمشرف بنجاح',
                                token,
                                user: {
                                    id: existingAdmin._id,
                                    username: existingAdmin.username,
                                    email: existingAdmin.email,
                                    balance: existingAdmin.balance,
                                    role: existingAdmin.role
                                }
                            });
                        }
                    }
                    
                    return res.status(500).json({ 
                        message: 'خطأ في إعداد المشرف', 
                        error: adminError.message 
                    });
                }
            } else {
                console.log('❌ كلمة المرور خاطئة للمشرف');
                return res.status(400).json({ message: 'كلمة المرور غير صحيحة للمشرف' });
            }
        }

        // 🔐 تسجيل الدخول العادي للمستخدمين
        console.log('👤 محاولة دخول مستخدم عادي');
        
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
        console.error('❌ خطأ عام في تسجيل الدخول:', error);
        res.status(500).json({ 
            message: 'خطأ في الخادم', 
            error: error.message
        });
    }
});
// الحصول على الخدمات
app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find({ active: true });
        console.log('📦 تم جلب', services.length, 'خدمة');
        res.json(services);
    } catch (error) {
        console.error('❌ خطأ في جلب الخدمات:', error);
        
        // إرجاع بيانات تجريبية في حالة الخطأ
        res.json(sampleServices);
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

        console.log('🛒 تم إنشاء طلب جديد:', order._id);
        
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
        console.error('❌ خطأ في إنشاء الطلب:', error);
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

        console.log('💳 تم شحن رصيد:', amount, 'للمستخدم:', user.username);
        
        res.json({ 
            message: 'تم شحن الرصيد بنجاح',
            newBalance: user.balance 
        });
    } catch (error) {
        console.error('❌ خطأ في شحن الرصيد:', error);
        res.status(500).json({ message: 'خطأ في شحن الرصيد', error: error.message });
    }
});

// الحصول على طلبات المستخدم
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.userId })
            .populate('serviceId')
            .sort({ createdAt: -1 });
        
        console.log('📋 تم جلب', orders.length, 'طلب للمستخدم');
        res.json(orders);
    } catch (error) {
        console.error('❌ خطأ في جلب الطلبات:', error);
        res.status(500).json({ message: 'خطأ في جلب الطلبات', error: error.message });
    }
});

// الحصول على المعاملات
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.userId })
            .sort({ createdAt: -1 });
        
        console.log('💰 تم جلب', transactions.length, 'معاملة للمستخدم');
        res.json(transactions);
    } catch (error) {
        console.error('❌ خطأ في جلب المعاملات:', error);
        res.status(500).json({ message: 'خطأ في جلب المعاملات', error: error.message });
    }
});

// 🔹 APIs للمشرف

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
        
        console.log('👑 تم جلب', orders.length, 'طلب للمشرف');
        res.json(orders);
    } catch (error) {
        console.error('❌ خطأ في جلب طلبات المشرف:', error);
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
        console.log('👥 تم جلب', users.length, 'مستخدم للمشرف');
        res.json(users);
    } catch (error) {
        console.error('❌ خطأ في جلب المستخدمين:', error);
        res.status(500).json({ message: 'خطأ في جلب المستخدمين', error: error.message });
    }
});

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

        console.log('🔄 تم تحديث حالة الطلب:', order._id, 'إلى:', status);
        
        res.json({ message: 'تم تحديث حالة الطلب', order });
    } catch (error) {
        console.error('❌ خطأ في تحديث الطلب:', error);
        res.status(500).json({ message: 'خطأ في تحديث الطلب', error: error.message });
    }
});

// API لفحص حالة الخادم
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'running',
        message: 'الخادم يعمل بشكل طبيعي',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// معالجة الأخطاء غير المتوقعة
process.on('uncaughtException', (error) => {
    console.error('❌ خطأ غير متوقع:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ خطأ في الوعد:', reason);
});

// تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ==================================');
    console.log('🚀 نظام SMM المتكامل يعمل بنجاح!');
    console.log('🚀 ==================================');
    console.log(`📡 الخادم يعمل على: http://localhost:${PORT}`);
    console.log(`🔗 العنوان المحلي: http://127.0.0.1:${PORT}`);
    console.log('⏰ وقت التشغيل:', new Date().toLocaleString('ar-EG'));
    console.log('💾 حالة قاعدة البيانات:', mongoose.connection.readyState === 1 ? 'متصل ✅' : 'غير متصل ⚠️');
    console.log('🔧 للمساعدة: تأكد من فتح المتصفح على العنوان الصحيح');
    console.log('🚀 ==================================');
});

console.log('🔄 جاري تشغيل الخادم...');
