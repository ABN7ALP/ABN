const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'الرجاء إدخال الاسم'],
  },
  email: {
    type: String,
    required: [true, 'الرجاء إدخال البريد الإلكتروني'],
    unique: true, // لضمان عدم تكرار البريد الإلكتروني
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'الرجاء إدخال بريد إلكتروني صالح',
    ],
  },
  password: {
    type: String,
    required: [true, 'الرجاء إدخال كلمة المرور'],
    minlength: 6, // لضمان كلمة مرور قوية
  },
  balance: {
    type: Number,
    default: 0, // الرصيد الافتراضي هو صفر
  },
  profileImage: {
    type: String,
    default: 'default.jpg', // صورة افتراضية
  },
  role: {
    type: String,
    enum: ['user', 'admin'], // الأدوار المتاحة
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// تشفير كلمة المرور تلقائياً قبل حفظ المستخدم
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);
