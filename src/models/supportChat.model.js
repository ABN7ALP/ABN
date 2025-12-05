const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: String, enum: ['user', 'support'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const supportChatSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    messages: [messageSchema]
}, { timestamps: true });

module.exports = mongoose.model('SupportChat', supportChatSchema);
