const TelegramBot = require('node-telegram-bot-api');
const SupportChat = require('../models/supportChat.model');
const User = require('../models/user.model');
const { getIo } = require('../../server');

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

    if (!msg.reply_to_message || !msg.reply_to_message.text) {
        return;
    }

    try {
        const originalMessageText = msg.reply_to_message.text;
        
        // 🎯🎯🎯 خطوة تشخيصية: اطبع النص الذي يراه البوت 🎯🎯🎯
        console.log("--- DEBUG: Original message text from bot's perspective ---");
        console.log(originalMessageText);
        console.log("---------------------------------------------------------");

        const match = originalMessageText.match(/\[ID:\s*(\w{24})\]/); // تعبير نمطي أكثر دقة
        
        if (!match || !match[1]) {
            bot.sendMessage(msg.chat.id, "لم أتمكن من العثور على معرف المستخدم. تأكد من أنك ترد على الرسالة الصحيحة التي تحتوي على [ID: ...].");
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
        bot.sendMessage(msg.chat.id, `حدث خطأ: ${error.message}`);
    }
});

module.exports = bot;
