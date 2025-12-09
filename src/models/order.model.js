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
   },         
     // 🚀🚀 الحقول الجديدة لنظام الاعتراض 🚀🚀
    dispute: {
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', null], // pending: تم الاعتراض, approved: تمت الموافقة, rejected: تم الرفض
            default: null
        },
        reason: { // سبب اعتراض المستخدم
            type: String,
            trim: true
        },
        adminResponse: { // رد الأدمن
            type: String,
            trim: true
        },
        date: { // تاريخ تقديم الاعتراض
            type: Date
        }
    }
}, {
    timestamps: true 
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
