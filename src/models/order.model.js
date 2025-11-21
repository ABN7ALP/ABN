const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true,
    enum: ['Instagram', 'TikTok', 'Twitter', 'Facebook'] // أمثلة للمنصات
  },
  service: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    default: 'قيد المراجعة', // الحالة الافتراضية للطلب
    enum: ['قيد المراجعة', 'قيد التنفيذ', 'مكتمل', 'ملغي']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
