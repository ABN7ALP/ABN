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
    },
    password: {
        type: String,
        required: [true, 'كلمة المرور مطلوبة'],
        minlength: [6, 'يجب أن تكون كلمة المرور 6 أحرف على الأقل']
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
    loginAttempts: {
        type: Number,
        default: 0,
        min: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    googleId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// --- تشفير كلمة المرور قبل الحفظ ---
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// --- دوال مساعدة للأمان ---
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incrementLoginAttempts = async function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
    }
    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 };
    }
    return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({ $set: { loginAttempts: 0, lastLogin: new Date() }, $unset: { lockUntil: 1 } });
};

// --- دالة مقارنة كلمة المرور (النسخة النهائية الصحيحة) ---
userSchema.methods.matchPassword = async function(enteredPassword) {
    if (this.isLocked) {
        throw new Error('الحساب مقفول مؤقتاً بسبب كثرة المحاولات الفاشلة. يرجى المحاولة بعد 30 دقيقة.');
    }

    const isMatch = await bcrypt.compare(enteredPassword, this.password);

    if (isMatch) {
        if (this.loginAttempts > 0) {
            await this.resetLoginAttempts();
        }
        return true;
    } else {
        await this.incrementLoginAttempts();
        return false;
    }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
