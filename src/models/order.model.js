
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false 
    },

    orderId: {
        type: String,
        unique: true // يضمن عدم تكرار المعرف أبداً
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
   },         
    dispute: {
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', null], // pending: تم الاعتراض, approved: تمت الموافقة, rejected: تم الرفض
            default: null
        },
        reason: { 
            type: String,
            trim: true
        },
        adminResponse: { 
            type: String,
            trim: true
        },
        date: { 
            type: Date
        }
    }
}, {
    timestamps: true 
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
