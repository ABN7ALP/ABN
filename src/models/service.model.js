const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    platform: {
        type: String,
        required: true,
        trim: true,
        // مثال: Instagram, TikTok, etc.
    },
    name: {
        type: String,
        required: true,
        trim: true,
        // مثال: متابعين, لايكات, etc.
    },
    pricePer1000: {
        type: Number,
        required: true,
        min: 0,
    },
    min: {
        type: Number,
        required: true,
        default: 100,
    },
    max: {
        type: Number,
        required: true,
        default: 100000,
    },
    // يمكن إضافة حقول أخرى مستقبلاً مثل 'type' (Default, Custom Comments, etc.)
});

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
