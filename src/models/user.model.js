const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'اسم المستخدم مطلوب'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'],
        maxlength: [30, 'اسم المستخدم يجب أن لا يتجاوز 30 حرف']
    },
    email: {
        type: String,
        required: [true, 'البريد الإلكتروني مطلوب'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'الرجاء إدخال بريد إلكتروني صالح']
    },
    // استبدل حقل كلمة المرور بالكامل بهذا الكود
 password: {
        type: String,
        required: [true, 'كلمة المرور مطلوبة'],
        minlength: [6, 'يجب أن تكون كلمة المرور 6 أحرف على الأقل'],
        // 🆕 منع كلمات المرور الضعيفة
        validate: {
            validator: function(password) {
                // تحقق من قوة كلمة المرور
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
            },
            message: 'كلمة المرور يجب أن تحتوي على حرف كبير، حرف صغير، رقم، ورمز خاص'
        }
    },
    profileImage: {
        type: String,
        default: null
    },
    balance: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'الرصيد لا يمكن أن يكون سالب']
    },
    isAdmin: { 
        type: Boolean,
        default: false
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    // 🆕 إضافة حقول جديدة للأمان
    loginAttempts: {
        type: Number,
        default: 0,
        min: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// 🆕 دالة للتحقق إذا كان الحساب مقفول
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// 🆕 منطق قفل الحساب بعد محاولات فاشلة
userSchema.methods.incrementLoginAttempts = async function() {
    // إذا انتهت مدة القفل، إعادة التعيين
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return await this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }
    
    // زيادة عدد المحاولات
    const updates = { $inc: { loginAttempts: 1 } };
    
    // قفل الحساب إذا تجاوز 5 محاولات
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // قفل لمدة 30 دقيقة
    }
    
    return await this.updateOne(updates);
};

// 🆕 إعادة تعيين المحاولات بعد تسجيل الدخول الناجح
userSchema.methods.resetLoginAttempts = async function() {
    return await this.updateOne({
        $set: { 
            loginAttempts: 0,
            lastLogin: new Date()
        },
        $unset: { lockUntil: 1 }
    });
};

// --- تشفير كلمة المرور قبل حفظ المستخدم ---
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    // 🆕 التحقق من قوة كلمة المرور قبل التشفير
    if (this.password.length < 6) {
        return next(new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'));
    }
    
    const salt = await bcrypt.genSalt(12); // 🆕 زيادة قوة التشفير
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// --- دالة لمقارنة كلمة المرور المدخلة بالكلمة المشفرة ---
// استبدل الدالة الحالية بالكامل بهذه النسخة المصححة
// --- دالة لمقارنة كلمة المرور المدخلة بالكلمة المشفرة ---
userSchema.methods.matchPassword = async function(enteredPassword) {
    // الخطوة 1: التحقق إذا كان الحساب مقفولاً
    if (this.isLocked) {
        // إذا كان مقفولاً، ألقِ خطأً واضحاً
        throw new Error('الحساب مقفول مؤقتاً بسبب كثرة المحاولات الفاشلة. يرجى المحاولة بعد 30 دقيقة.');
    }

    // الخطوة 2: مقارنة كلمة المرور
    const isMatch = await require('bcryptjs').compare(enteredPassword, this.password);

    // الخطوة 3: التعامل مع النتائج
    if (isMatch) {
        // إذا كانت كلمة المرور صحيحة، قم بإعادة تعيين محاولات الدخول الفاشلة
        if (this.loginAttempts > 0) {
            await this.resetLoginAttempts();
        }
        // أرجع true للإشارة إلى نجاح المصادقة
        return true;
    } else {
        // إذا كانت كلمة المرور خاطئة، قم بزيادة عدد المحاولات الفاشلة
        await this.incrementLoginAttempts();
        // أرجع false للإشارة إلى فشل المصادقة
        return false;
    }
};


const User = mongoose.model('User', userSchema);

module.exports = User;
