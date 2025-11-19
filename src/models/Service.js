const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'الرجاء إدخال اسم الخدمة'],
  },
  platform: {
    type: String,
    required: [true, 'الرجاء تحديد المنصة'],
    enum: ['Instagram', 'TikTok', 'Facebook', 'YouTube', 'Twitter'], // المنصات المتاحة
  },
  pricePer1000: {
    type: Number,
    required: [true, 'الرجاء إدخال السعر لكل 1000'],
  },
  description: {
    type: String,
    default: 'لا يوجد وصف لهذه الخدمة.',
  },
  minOrder: {
    type: Number,
    default: 100,
  },
  maxOrder: {
    type: Number,
    default: 10000,
  },
  isActive: {
    type: Boolean,
    default: true, // لتفعيل أو تعطيل الخدمة من لوحة التحكم لاحقاً
  },
});

module.exports = mongoose.model('Service', serviceSchema);
