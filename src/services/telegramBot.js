const TelegramBot = require('node-telegram-bot-api');
const SupportChat = require('../models/supportChat.model');
const User = require('../models/user.model');
const { getIo } = require('../config/socket');

require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('❌ Telegram Bot Token not found!');
    return;
}

const bot = new TelegramBot(token, { polling: true });

let botId = null;
bot.getMe().then((me) => {
    botId = me.id;
    console.log(`🤖 Telegram Bot "${me.first_name}" started (ID: ${botId})`);
}).catch(err => console.error("Could not get bot info:", err));

bot.on('message', async (msg) => {
    if (msg.from.id === botId) {
        return; 
    }

    
bot.on('message', async (msg) => {
    if (!msg.reply_to_message) return;

    try {
        const originalMessageText = msg.reply_to_message.caption || msg.reply_to_message.text;
        const match = originalMessageText.match(/ID:\s*(\w{24})/);
        if (!match) return;

        const userId = match[1];
        const replyText = msg.text || msg.caption; // 🎯 الحصول على النص سواء كان مع صورة أو بدون
        const replyPhoto = msg.photo ? msg.photo[msg.photo.length - 1].file_id : null;
        let imageUrl = null;

        // لا نحتاج لرفع الصورة هنا، تليجرام يعطينا رابط مباشر
        if (replyPhoto) {
            imageUrl = await bot.getFileLink(replyPhoto);
        }

        const chat = await SupportChat.findOne({ userId });
        if (!chat) return;

        chat.messages.push({
            sender: 'support',
            text: replyText,
            imageUrl: imageUrl, // 🎯 حفظ رابط الصورة
            timestamp: new Date()
        });
        await chat.save();

        getIo().to(userId).emit('support-reply', {
            userId: userId,
            message: replyText,
            imageUrl: imageUrl, // 🎯 إرسال رابط الصورة للواجهة الأمامية
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error handling Telegram reply:', error);
    }
});

module.exports = bot
