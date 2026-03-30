const Counter = require('./counter.model');
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
    type: String, // سيحتوي على اسم اللعبة/المنصة الرئيسي
    required: true 
},
serviceDetails: {
    type: String, // سيحتوي على اسم الحزمة أو تفاصيل الخدمة المحددة
    required: false
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


orderSchema.pre('save', async function(next) {
    
    if (this.isNew) {
        try {
            
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'orderId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true } 
            );
            
            // قم بإنشاء المعرف الجديد (مثال: MX-1001)
            this.orderId = `MX-${counter.seq}`;
            next();
        } catch (error) {
            
            next(error);
        }
    } else {
        next();
    }
});




const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
