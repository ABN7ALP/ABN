const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true, // فريد لكل خدمة
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
    pricePer1000: {
        type: Number,
        required: true,
        min: 0
    },
    min: {
        type: Number,
        required: true,
        default: 100
    },
    max: {
        type: Number,
        required: true,
        default: 100000
    }
});

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
