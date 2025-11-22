const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // حقل لربط الطلب بالمستخدم (اختياري للسماح للزوار بالطلب)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // هذا الاسم 'User' يجب أن يطابق الاسم في mongoose.model('User', ...)
        required: false 
    },
    platform: { 
        type: String, 
        required: true 
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
        enum: ['قيد المراجعة', 'قيد التنفيذ', 'مكتمل', 'ملغي'],
        default: 'قيد المراجعة'
    }
}, {
    // هذا الخيار يضيف حقلي createdAt و updatedAt تلقائياً
    timestamps: true 
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
