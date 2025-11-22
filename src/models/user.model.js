const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'اسم المستخدم مطلوب'],
        unique: true,
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        required: [true, 'البريد الإلكتروني مطلوب'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'الرجاء إدخال بريد إلكتروني صالح']
    },
    password: {
        type: String,
        required: [true, 'كلمة المرور مطلوبة'],
        minlength: [6, 'يجب أن تكون كلمة المرور 6 أحرف على الأقل']
    },

    // --- الحقل الجديد هنا ---
    balance: {
        type: Number,
        required: true,
        default: 0 // الرصيد الافتراضي لأي مستخدم جديد هو صفر
    }
}, {
    timestamps: true
});

// --- تشفير كلمة المرور قبل حفظ المستخدم ---
// هذا الكود يعمل تلقائياً قبل أي عملية حفظ 'save'
userSchema.pre('save', async function(next) {
    // لا تقم بإعادة التشفير إذا لم يتم تعديل كلمة المرور
    if (!this.isModified('password')) {
        return next();
    }
    // إنشاء "ملح" لزيادة قوة التشفير
    const salt = await bcrypt.genSalt(10);
    // تشفير كلمة المرور مع الملح
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// --- دالة لمقارنة كلمة المرور المدخلة بالكلمة المشفرة ---
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
