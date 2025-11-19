const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // يربط الطلب بالمستخدم الذي قام به
    required: true,
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service', // يربط الطلب بالخدمة المطلوبة
    required: true,
  },
  link: {
    type: String,
    required: [true, 'الرابط مطلوب'],
  },
  quantity: {
    type: Number,
    required: [true, 'الكمية مطلوبة'],
  },
  charge: {
    type: Number,
    required: [true, 'التكلفة مطلوبة'],
  },
  status: {
    type: String,
    enum: ['Pending', 'In progress', 'Completed', 'Canceled', 'Partial'],
    default: 'Pending', // الحالة الافتراضية للطلب
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', orderSchema);
