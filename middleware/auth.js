
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // سنحتاج لإنشاء هذا الملف

// Middleware للمصادقة الأساسية
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

// Middleware للتحقق من صلاحيات التعديل على الطلبات
const requireOrderOwnershipOrAdmin = async (req, res, next) => {
    try {
        const Order = require('../models/Order');
        const order = await Order.findById(req.params.orderId);
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                error: 'الطلب غير موجود',
                code: 'ORDER_NOT_FOUND'
            });
        }

        if (req.user.role !== 'admin' && order.userId.toString() !== req.user.userId) {
            return res.status(403).json({ 
                success: false,
                error: 'غير مصرح لك للتعديل على هذا الطلب',
                code: 'ORDER_OWNERSHIP_REQUIRED'
            });
        }

        req.order = order;
        next();
    } catch (error) {
        console.error('Error in requireOrderOwnershipOrAdmin:', error);
        return res.status(500).json({ 
            success: false,
            error: 'خطأ في التحقق من صلاحيات الطلب',
            code: 'SERVER_ERROR'
        });
    }
};

// Middleware للتحقق من صلاحيات التعديل على المعاملات
const requireTransactionOwnershipOrAdmin = async (req, res, next) => {
    try {
        const Transaction = require('../models/Transaction');
        const transaction = await Transaction.findById(req.params.transactionId);
        
        if (!transaction) {
            return res.status(404).json({ 
                success: false,
                error: 'المعاملة غير موجودة',
                code: 'TRANSACTION_NOT_FOUND'
            });
        }

        if (req.user.role !== 'admin' && transaction.userId.toString() !== req.user.userId) {
            return res.status(403).json({ 
                success: false,
                error: 'غير مصرح لك للوصول إلى هذه المعاملة',
                code: 'TRANSACTION_OWNERSHIP_REQUIRED'
            });
        }

        req.transaction = transaction;
        next();
    } catch (error) {
        console.error('Error in requireTransactionOwnershipOrAdmin:', error);
        return res.status(500).json({ 
            success: false,
            error: 'خطأ في التحقق من صلاحيات المعاملة',
            code: 'SERVER_ERROR'
        });
    }
};

// Middleware للتحقق من الحدود القصوى للطلبات
const checkOrderLimits = async (req, res, next) => {
    try {
        const { quantity, serviceId } = req.body;
        const Service = require('../models/Service');
        
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
        const { quantity, serviceId } = req.body;
        const User = require('../models/User');
        const Service = require('../models/Service');
        
        const user = await User.findById(req.user.userId);
        const service = await Service.findById(serviceId);

        if (!user || !service) {
            return res.status(404).json({ 
                success: false,
                error: 'البيانات غير موجودة',
                code: 'DATA_NOT_FOUND'
            });
        }

        const totalPrice = (service.price * quantity) / 1000;

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
    const validator = require('validator');

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

    // تحقق إضافي حسب المنصة
    const Service = require('../models/Service');
    Service.findById(serviceId).then(service => {
        if (service) {
            const platform = service.platform;
            const linkPatterns = {
                'instagram': /(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/.+/,
                'youtube': /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
                'tiktok': /(https?:\/\/)?(www\.)?(tiktok\.com)\/.+/,
                'twitter': /(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+/,
                'facebook': /(https?:\/\/)?(www\.)?(facebook\.com|fb\.com)\/.+/,
                'telegram': /(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\/.+/
            };

            if (platform in linkPatterns && !linkPatterns[platform].test(link)) {
                return res.status(400).json({ 
                    success: false,
                    error: `الرابط غير صحيح لمنصة ${getPlatformName(platform)}`,
                    code: 'INVALID_PLATFORM_LINK'
                });
            }
        }
        next();
    }).catch(error => {
        console.error('Error in validateLink:', error);
        next();
    });
};

// دالة مساعدة للحصول على اسم المنصة
function getPlatformName(platform) {
    const platforms = {
        'instagram': 'انستجرام',
        'youtube': 'يوتيوب',
        'tiktok': 'تيك توك',
        'twitter': 'تويتر',
        'facebook': 'فيسبوك',
        'telegram': 'تيليجرام'
    };
    return platforms[platform] || platform;
}

// Middleware للتحقق من صلاحيات التعديل على المستخدمين
const requireUserManagement = async (req, res, next) => {
    try {
        const targetUserId = req.params.userId;
        
        // الأدمن فقط يمكنه إدارة المستخدمين
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: 'غير مصرح لك لإدارة المستخدمين',
                code: 'USER_MANAGEMENT_REQUIRED'
            });
        }

        // لا يمكن للأدمن تعديل حسابه الخاص من خلال هذا الـ middleware
        if (targetUserId && targetUserId === req.user.userId) {
            return res.status(400).json({ 
                success: false,
                error: 'لا يمكنك تعديل حسابك الخاص من هنا',
                code: 'SELF_MANAGEMENT_NOT_ALLOWED'
            });
        }

        next();
    } catch (error) {
        console.error('Error in requireUserManagement:', error);
        return res.status(500).json({ 
            success: false,
            error: 'خطأ في التحقق من صلاحيات إدارة المستخدمين',
            code: 'SERVER_ERROR'
        });
    }
};

// Middleware للتحقق من صلاحيات الوصول إلى السجلات
const requireLogsAccess = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            error: 'غير مصرح لك للوصول إلى سجلات النظام',
            code: 'LOGS_ACCESS_REQUIRED'
        });
    }
    next();
};

// Middleware للتحقق من صلاحيات التحقق من المعاملات
const requireTransactionVerification = async (req, res, next) => {
    try {
        const Transaction = require('../models/Transaction');
        const transaction = await Transaction.findById(req.params.transactionId);
        
        if (!transaction) {
            return res.status(404).json({ 
                success: false,
                error: 'المعاملة غير موجودة',
                code: 'TRANSACTION_NOT_FOUND'
            });
        }

        // فقط الأدمن يمكنه التحقق من المعاملات
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: 'غير مصرح لك للتحقق من المعاملات',
                code: 'TRANSACTION_VERIFICATION_REQUIRED'
            });
        }

        req.transaction = transaction;
        next();
    } catch (error) {
        console.error('Error in requireTransactionVerification:', error);
        return res.status(500).json({ 
            success: false,
            error: 'خطأ في التحقق من صلاحيات المعاملة',
            code: 'SERVER_ERROR'
        });
    }
};

// Middleware للتحقق من معدل الطلبات (Rate Limiting)
const rateLimit = require('express-rate-limit');

const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ساعة
    max: 5, // حد 5 محاولات لكل IP
    message: {
        success: false,
        error: 'تم إنشاء الكثير من الحسابات من هذا العنوان، يرجى المحاولة بعد ساعة',
        code: 'ACCOUNT_CREATION_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 10, // حد 10 محاولات دخول
    message: {
        success: false,
        error: 'عدد كبير من محاولات الدخول، يرجى المحاولة بعد 15 دقيقة',
        code: 'LOGIN_ATTEMPTS_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const orderLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 دقيقة
    max: 10, // حد 10 طلبات في الدقيقة
    message: {
        success: false,
        error: 'عدد كبير من الطلبات، يرجى الانتظار قليلاً',
        code: 'ORDER_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware للتحقق من صحة البيانات المدخلة
const validateInput = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message,
                code: 'VALIDATION_ERROR'
            });
        }
        next();
    };
};

// Middleware للتحقق من وجود الملف في طلبات الرفع
const validateFileUpload = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: 'الملف مطلوب',
            code: 'FILE_REQUIRED'
        });
    }

    // التحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
            success: false,
            error: 'نوع الملف غير مسموح. المسموح: JPEG, PNG, JPG, GIF',
            code: 'INVALID_FILE_TYPE'
        });
    }

    // التحقق من حجم الملف (5MB كحد أقصى)
    const maxSize = 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: 'حجم الملف كبير جداً. الحد الأقصى 5MB',
            code: 'FILE_TOO_LARGE'
        });
    }

    next();
};

// Middleware للتحقق من صلاحيات API
const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({
            success: false,
            error: 'مفتاح API غير صحيح',
            code: 'INVALID_API_KEY'
        });
    }
    next();
};

// Middleware للتحقق من الإصدار
const checkVersion = (req, res, next) => {
    const clientVersion = req.headers['x-client-version'];
    const minVersion = '1.0.0'; // الحد الأدنى للإصدار المطلوب

    if (!clientVersion) {
        return res.status(400).json({
            success: false,
            error: 'إصدار التطبيق مطلوب',
            code: 'VERSION_REQUIRED'
        });
    }

    if (compareVersions(clientVersion, minVersion) < 0) {
        return res.status(426).json({
            success: false,
            error: 'يرجى تحديث التطبيق إلى الإصدار الأحدث',
            code: 'UPGRADE_REQUIRED',
            minVersion: minVersion
        });
    }

    next();
};

// دالة مساعدة لمقارنة الإصدارات
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        
        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
    }
    
    return 0;
}

// Middleware للتحقق من الصحة العامة للطلب
const sanitizeInput = (req, res, next) => {
    // تنظيف المدخلات من أي محاولات حقن
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
                
                // إزالة الأحرف الخطرة
                req.body[key] = req.body[key].replace(/[<>]/g, '');
                
                // تحديد طول النص
                if (req.body[key].length > 1000) {
                    req.body[key] = req.body[key].substring(0, 1000);
                }
            }
        });
    }
    next();
};

// Middleware للتحقق من حالة الخدمة
const checkServiceStatus = async (req, res, next) => {
    try {
        const { serviceId } = req.body;
        const Service = require('../models/Service');
        
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

// Middleware للتحقق من حدود الإيداع
const checkDepositLimits = (req, res, next) => {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ 
            success: false,
            error: 'المبلغ يجب أن يكون أكبر من الصفر',
            code: 'INVALID_AMOUNT'
        });
    }

    const minDeposit = 1; // الحد الأدنى للإيداع
    const maxDeposit = 10000; // الحد الأقصى للإيداع

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

    next();
};

// Middleware للتحقق من الصلاحيات المالية
const requireFinancialAccess = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            error: 'غير مصرح لك للوصول إلى البيانات المالية',
            code: 'FINANCIAL_ACCESS_REQUIRED'
        });
    }
    next();
};

// Middleware للتحقق من الصلاحيات الإحصائية
const requireStatsAccess = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            error: 'غير مصرح لك للوصول إلى الإحصائيات',
            code: 'STATS_ACCESS_REQUIRED'
        });
    }
    next();
};

// Middleware للتحقق من الصلاحيات النظامية
const requireSystemAccess = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            error: 'غير مصرح لك للوصول إلى إعدادات النظام',
            code: 'SYSTEM_ACCESS_REQUIRED'
        });
    }
    next();
};

// Middleware للتحقق من الصلاحيات المتقدمة
const requireAdvancedAccess = async (req, res, next) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user.userId);
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: 'غير مصرح لك للوصول إلى هذه الميزات المتقدمة',
                code: 'ADVANCED_ACCESS_REQUIRED'
            });
        }

        // تحقق إضافي للأدمن الرئيسي إذا لزم الأمر
        if (req.user.userId !== process.env.SUPER_ADMIN_ID && req.path.includes('/super-admin')) {
            return res.status(403).json({ 
                success: false,
                error: 'غير مصرح لك للوصوع إلى هذه الصلاحيات',
                code: 'SUPER_ADMIN_REQUIRED'
            });
        }

        next();
    } catch (error) {
        console.error('Error in requireAdvancedAccess:', error);
        return res.status(500).json({ 
            success: false,
            error: 'خطأ في التحقق من الصلاحيات المتقدمة',
            code: 'SERVER_ERROR'
        });
    }
};

// Middleware للتحقق من الصلاحيات حسب النقاط
const requirePointsAccess = (requiredPoints) => {
    return async (req, res, next) => {
        try {
            const User = require('../models/User');
            const user = await User.findById(req.user.userId);
            
            if (!user || user.points < requiredPoints) {
                return res.status(403).json({ 
                    success: false,
                    error: `تحتاج ${requiredPoints} نقطة للوصول إلى هذه الميزة`,
                    code: 'INSUFFICIENT_POINTS'
                });
            }

            next();
        } catch (error) {
            console.error('Error in requirePointsAccess:', error);
            return res.status(500).json({ 
                success: false,
                error: 'خطأ في التحقق من النقاط',
                code: 'SERVER_ERROR'
            });
        }
    };
};

// Middleware للتحقق من الصلاحيات حسب الاشتراك
const requireSubscription = (requiredTier) => {
    return async (req, res, next) => {
        try {
            const User = require('../models/User');
            const user = await User.findById(req.user.userId);
            
            if (!user || user.subscriptionTier < requiredTier) {
                const tiers = { 1: 'أساسي', 2: 'متميز', 3: 'احترافي' };
                return res.status(403).json({ 
                    success: false,
                    error: `تحتاج اشتراك ${tiers[requiredTier]} للوصول إلى هذه الميزة`,
                    code: 'SUBSCRIPTION_REQUIRED'
                });
            }

            next();
        } catch (error) {
            console.error('Error in requireSubscription:', error);
            return res.status(500).json({ 
                success: false,
                error: 'خطأ في التحقق من الاشتراك',
                code: 'SERVER_ERROR'
            });
        }
    };
};

// Middleware للتحقق من الصلاحيات الجغرافية
const checkGeoLocation = (req, res, next) => {
    const allowedCountries = ['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ'];
    const clientCountry = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || 'Unknown';

    if (!allowedCountries.includes(clientCountry) && clientCountry !== 'Unknown') {
        return res.status(403).json({ 
            success: false,
            error: 'الخدمة غير متاحة في منطقتك',
            code: 'GEO_RESTRICTED'
        });
    }

    next();
};

// Middleware للتحقق من وقت التشغيل
const checkMaintenanceMode = (req, res, next) => {
    const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    
    if (maintenanceMode && req.user.role !== 'admin') {
        return res.status(503).json({ 
            success: false,
            error: 'النظام تحت الصيانة، يرجى المحاولة لاحقاً',
            code: 'MAINTENANCE_MODE'
        });
    }

    next();
};

// Middleware للتحقق من الصلاحيات الموسمية
const checkSeasonalAccess = (req, res, next) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // مثال: تقييد الوصول في أيام معينة
    const restrictedDays = [
        { month: 1, day: 1 },   // رأس السنة
        { month: 12, day: 25 }, // الكريسماس
    ];

    const isRestricted = restrictedDays.some(d => d.month === month && d.day === day);

    if (isRestricted && req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            error: 'الخدمة غير متاحة مؤقتاً بسبب العطلة',
            code: 'SEASONAL_RESTRICTION'
        });
    }

    next();
};

// Middleware للتحقق من الصلاحيات حسب الوقت
const checkTimeAccess = (startHour, endHour) => {
    return (req, res, next) => {
        const now = new Date();
        const currentHour = now.getHours();

        if (currentHour < startHour || currentHour >= endHour) {
            return res.status(403).json({ 
                success: false,
                error: `الخدمة متاحة فقط من ${startHour}:00 إلى ${endHour}:00`,
                code: 'TIME_RESTRICTED'
            });
        }

        next();
    };
};

// Middleware للتحقق من الصلاحيات المجمعة
const combinedAuth = (...middlewares) => {
    return (req, res, next) => {
        const executeMiddleware = (index) => {
            if (index === middlewares.length) return next();
            
            middlewares[index](req, res, (err) => {
                if (err) return next(err);
                executeMiddleware(index + 1);
            });
        };
        
        executeMiddleware(0);
    };
};

// تصدير جميع الـ Middlewares
module.exports = {
    authenticateToken,
    requireActiveUser,
    requireAdmin,
    requireUser,
    requireOwnership,
    requireOrderOwnershipOrAdmin,
    requireTransactionOwnershipOrAdmin,
    requireTransactionVerification,
    checkOrderLimits,
    checkBalance,
    validateLink,
    requireUserManagement,
    requireLogsAccess,
    createAccountLimiter,
    loginLimiter,
    orderLimiter,
    validateInput,
    validateFileUpload,
    requireApiKey,
    checkVersion,
    sanitizeInput,
    checkServiceStatus,
    checkDepositLimits,
    requireFinancialAccess,
    requireStatsAccess,
    requireSystemAccess,
    requireAdvancedAccess,
    requirePointsAccess,
    requireSubscription,
    checkGeoLocation,
    checkMaintenanceMode,
    checkSeasonalAccess,
    checkTimeAccess,
    combinedAuth
};
