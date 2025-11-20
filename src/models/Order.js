const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    // =================== قم بإزالة هذا السطر ===================
    // id: { type: Number, unique: true }, // هذا السطر يسبب المشكلة
    // ==========================================================

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    link: {
        type: String,
        required: [true, 'الرجاء إدخال الرابط']
    },
    quantity: {
        type: Number,
        required: [true, 'الرجاء إدخال الكمية']
    },
    charge: { // التكلفة التي تم خصمها من المستخدم
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'In progress', 'Completed', 'Canceled', 'Partial'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

mongoose.model('Order', OrderSchema);
