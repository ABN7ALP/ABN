const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    services: [{
        type: String, // service IDs
        ref: 'Service'
    }],
    discountPercentage: {
        type: Number,
        min: 0,
        max: 100
    },
    discountAmount: {
        type: Number,
        min: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    targetUsers: {
        type: String,
        enum: ['all', 'new', 'existing'],
        default: 'all'
    }
}, {
    timestamps: true
});

// Middleware للتحقق من أن العرض لا يزال فعالاً
offerSchema.pre('save', function(next) {
    const now = new Date();
    if (this.endDate < now) {
        this.isActive = false;
    }
    next();
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
