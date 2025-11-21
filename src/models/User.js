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
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'الرجاء إدخال بريد إلكتروني صالح',
    ],
  },
  password: {
    type: String,
    required: [true, 'الرجاء إدخال كلمة المرور'],
    minlength: 6,
    select: false, 
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  balance: {
    type: Number,
    default: 0,
  },
  profileImage: {
    type: String,
    default: 'default.jpg',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ======================= الإصلاح الحاسم هنا =======================
// تشفير كلمة المرور قبل الحفظ (النسخة الأكثر موثوقية)
userSchema.pre('save', async function (next) {
  // قم بتشغيل هذا الكود فقط إذا تم تعديل كلمة المرور (أو كانت جديدة)
  if (!this.isModified('password')) {
    return next();
  }

  // قم بإنشاء salt وتشفير كلمة المرور
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
// =================================================================

// مقارنة كلمة المرور المدخلة بكلمة المرور المشفرة
userSchema.methods.matchPassword = async function (enteredPassword) {
  // تأكد من أن enteredPassword ليست فارغة قبل المقارنة
  if (!enteredPassword || !this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
