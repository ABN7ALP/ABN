// models/deposit.model.js
const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true, enum: ['bank', 'sham', 'whatsapp'] },
    depositorName: { type: String, required: true },
    
    // 🔄 التعديل هنا: تخزين رابط الصورة فقط
    receiptImage: { 
        type: String, // سيتم تخزين رابط Cloudinary فقط
        required: true 
    },
    
    // 🆕 إضافة publicId لحذف الصورة لاحقاً إذا لزم
    receiptPublicId: {
        type: String,
        default: null
    },
    
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    
}, { timestamps: true });

const Deposit = mongoose.model('Deposit', depositSchema);
module.exports = Deposit;
