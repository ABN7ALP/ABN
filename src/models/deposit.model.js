const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true, enum: ['bank', 'sham', 'whatsapp'] },
    depositorName: { type: String, required: true },
    // تم التغيير هنا: سيتم تخزين الصورة كنص Base64
    receiptImage: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    
}, { timestamps: true }); // timestamps يضيف createdAt و updatedAt

const Deposit = mongoose.model('Deposit', depositSchema);

module.exports = Deposit;
