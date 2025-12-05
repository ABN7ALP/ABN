const mongoose = require('mongoose');
const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [{
        sender: { type: String, enum: ['user', 'support'], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    lastUserMessage: { type: Date }
}, { timestamps: true });
module.exports = mongoose.model('SupportChat', chatSchema);
