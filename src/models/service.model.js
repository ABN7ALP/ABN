const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, default: '' }
});

const serviceSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        required: true
    },
    platform: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    // نوع الخدمة: smm = خدمات تواصل اجتماعي, game = ألعاب وتطبيقات
    type: {
        type: String,
        enum: ['smm', 'game'],
        default: 'smm'
    },
    // حقول خاصة بخدمات SMM فقط
    pricePer1000: {
        type: Number,
        min: 0,
        default: 0
    },
    min: {
        type: Number,
        default: 100
    },
    max: {
        type: Number,
        default: 100000
    },
    step: {
        type: Number,
        default: 1
    },
    // حقول خاصة بالألعاب والتطبيقات
    packages: {
        type: [packageSchema],
        default: []
    },
    idLabel: {
        type: String,
        default: 'أدخل رقم الـ ID'
    },
   idPlaceholder: {
        type: String,
        default: 'مثال: 123456789'
    },
    allowCustomQuantity: {
        type: Boolean,
        default: false
    },
    customPricePer1000: {
        type: Number,
        default: 0
    } 
});

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
