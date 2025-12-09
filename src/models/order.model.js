// 🔽🔽 استبدل orderSchema بالكامل بهذا الكود 🔽🔽

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
        // 🚀🚀 الإضافة هنا 🚀🚀
        enum: ['قيد المراجعة', 'قيد التنفيذ', 'مكتمل', 'ملغي', 'ملغي (خطأ مستخدم)'],
        default: 'قيد المراجعة'
    },
    // 🚀🚀 الحقل الجديد هنا 🚀🚀
    cancellationReason: {
        type: String,
        trim: true,
        default: null
    }
}, {
    timestamps: true 
});

// ... باقي الكود يبقى كما هو
const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
