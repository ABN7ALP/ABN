// 🚀🚀 أضف هذا السطر في بداية الملف 🚀🚀
const mongoose = require('mongoose');

// 🔽🔽 الكود الحالي الخاص بك يبدأ من هنا 🔽🔽
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
        enum: ['قيد المراجعة', 'قيد التنفيذ', 'مكتمل', 'ملغي', 'ملغي (خطأ مستخدم)'],
        default: 'قيد المراجعة'
    },
    cancellationReason: {
        type: String,
        trim: true,
        default: null
    }
}, {
    timestamps: true 
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
