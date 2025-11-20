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
    // select: false, // <-- قم بحذف هذا السطر أو تحويله إلى تعليق
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

// تشفير كلمة المرور قبل الحفظ (هذا الكود ممتاز ولا يحتاج تعديل)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// مقارنة كلمة المرور المدخلة بكلمة المرور المشفرة (هذا الكود ممتاز ولا يحتاج تعديل)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// =================== تعديل بسيط هنا أيضاً ===================
// في ملفات المشروع التي أرسلتها لي، أنت تستخدم mongoose.model() بدون module.exports
// للحفاظ على التناسق، سنستخدم نفس الطريقة
mongoose.model('User', userSchema);
// module.exports = mongoose.model('User', userSchema); // <-- قم بحذف أو تعليق هذا السطر
// ==========================================================
