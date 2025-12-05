const TelegramBot = require('node-telegram-bot-api');
// 🎯🎯🎯 الإصلاح هنا 🎯🎯🎯
const SupportChat = require('../models/supportChat.model');
const User = require('../models/user.model');
const { getIo } = require('../../server'); // المسار الصحيح للخروج من services ثم src

require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('❌ Telegram Bot Token not found in .env file!');
    return;
}

const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Telegram Bot has been started...');

// ... (باقي كود البوت يبقى كما هو)
bot.on('message', async (msg) => {
    if (!msg.reply_to_message || !msg.reply_to_message.text) {
        if (msg.text.startsWith('/')) {
            bot.sendMessage(msg.chat.id, "هذا الأمر غير معروف. للرد على مستخدم، يرجى استخدام ميزة 'Reply' على رسالته.");
        }
        return;
    }

    try {
        const originalMessageText = msg.reply_to_message.text;
        const match = originalMessageText.match(/\[ID:\s*(\w+)\]/);
        
        if (!match || !match[1]) {
            console.error("Failed to find user ID in message:", originalMessageText);
            bot.sendMessage(msg.chat.id, "لم أتمكن من العثور على معرف المستخدم في الرسالة الأصلية. تأكد من أنك ترد على الرسالة الصحيحة التي تحتوي على [ID: ...].");
            return;
        }
        
        const userId = match[1];
        const replyText = msg.text;

        const chat = await SupportChat.findOne({ userId });
        if (!chat) {
            bot.sendMessage(msg.chat.id, `لا توجد محادثة نشطة للمستخدم بالمعرف: ${userId}`);
            return;
        }

        chat.messages.push({ sender: 'support', text: replyText, timestamp: new Date() });
        await chat.save();

        const io = getIo();
        io.to(userId).emit('support-reply', {
            userId: userId,
            message: replyText,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error handling Telegram reply:', error);
        bot.sendMessage(msg.chat.id, `حدث خطأ أثناء معالجة الرد: ${error.message}`);
    }
});


module.exports = bot;
