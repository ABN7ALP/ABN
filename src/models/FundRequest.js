const mongoose = require('mongoose');

const fundRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    method: {
        type: String,
        required: true,
        enum: ['Bank', 'ShamCash', 'Office'], // طرق الدفع المتاحة
    },
    amount: {
        type: Number,
        required: true,
    },
    details: { // لتخزين معلومات إضافية مثل اسم المرسل أو رقم المعاملة
        type: String, 
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('FundRequest', fundRequestSchema);
