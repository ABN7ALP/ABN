const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        minlength: 3,
        maxlength: 30,
        trim: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        validate: {
            validator: function(v) {
                return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
            },
            message: 'بريد إلكتروني غير صحيح'
        }
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    avatar: { 
        type: String, 
        default: '/images/default-avatar.png'
    },
    balance: { 
        type: Number, 
        default: 0,
        min: 0
    },
    role: { 
        type: String, 
        enum: ['user', 'admin', 'moderator'], 
        default: 'user' 
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'banned'],
        default: 'active'
    },
    points: {
        type: Number,
        default: 0
    },
    subscriptionTier: {
        type: Number,
        enum: [1, 2, 3], // 1: أساسي, 2: متميز, 3: احترافي
        default: 1
    },
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts
userSchema.methods.incrementLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    
    return this.updateOne(updates);
};

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update updatedAt before saving
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method for finding active users
userSchema.statics.findActive = function() {
    return this.find({ status: 'active' });
};

// Static method for finding by role
userSchema.statics.findByRole = function(role) {
    return this.find({ role, status: 'active' });
};

// Method to get user profile (without sensitive data)
userSchema.methods.getProfile = function() {
    return {
        id: this._id,
        username: this.username,
        email: this.email,
        avatar: this.avatar,
        balance: this.balance,
        role: this.role,
        status: this.status,
        points: this.points,
        subscriptionTier: this.subscriptionTier,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt
    };
};

module.exports = mongoose.model('User', userSchema);
