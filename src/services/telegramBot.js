const TelegramBot = require('node-telegram-bot-api');
const SupportChat = require('../models/supportChat.model');
const { getIo } = require('../config/socket');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('❌ Telegram Bot Token not found!');
    // في بيئة الإنتاج، من الأفضل إيقاف العملية إذا لم يكن التوكن موجوداً
    process.exit(1); 
}

const bot = new TelegramBot(token, { polling: true });

let botId = null;
bot.getMe().then((me) => {
    botId = me.id;
    console.log(`🤖 Telegram Bot "${me.first_name}" started (ID: ${botId})`);
}).catch(err => {
    console.error("Fatal: Could not get bot info. Check token and network.", err);
    process.exit(1);
});

// ===================================================================
// 🎯🎯🎯 تعريف واحد فقط لحدث 'message' 🎯🎯🎯
// ===================================================================
bot.on('message', async (msg) => {
    // 1. تجاهل الرسائل التي يرسلها البوت بنفسه
    if (msg.from.id === botId) {
        return; 
    }

    // 2. تجاهل الرسائل العادية التي ليست رداً
    if (!msg.reply_to_message) {
        // يمكنك إضافة رسالة مساعدة هنا إذا أردت
        // bot.sendMessage(msg.chat.id, "للرد على مستخدم، يرجى استخدام ميزة 'Reply'.");
        return;
    }

    // 3. معالجة الردود
    try {
        const originalMessageText = msg.reply_to_message.caption || msg.reply_to_message.text;
        if (!originalMessageText) {
            console.warn("Reply to a message with no text/caption. Ignoring.");
            return;
        }

        const match = originalMessageText.match(/ID:\s*(\w{24})/);
        if (!match || !match[1]) {
            console.error("Failed to find user ID in replied message:", originalMessageText);
            bot.sendMessage(msg.chat.id, "لم أتمكن من العثور على معرف المستخدم. تأكد من أنك ترد على الرسالة الصحيحة.");
            return;
        }
        
        const userId = match[1];
        const replyText = msg.text || msg.caption;
        const replyPhoto = msg.photo ? msg.photo[msg.photo.length - 1].file_id : null;
        let imageUrl = null;

        if (replyPhoto) {
            imageUrl = await bot.getFileLink(replyPhoto);
        }

        const chat = await SupportChat.findOne({ userId });
        if (!chat) {
            bot.sendMessage(msg.chat.id, `لا توجد محادثة نشطة للمستخدم بالمعرف: ${userId}`);
            return;
        }

        chat.messages.push({
            sender: 'support',
            text: replyText,
            imageUrl: imageUrl,
            timestamp: new Date()
        });
        await chat.save();

        getIo().to(userId).emit('support-reply', {
            userId: userId,
            message: replyText,
            imageUrl: imageUrl,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error handling Telegram reply:', error);
        bot.sendMessage(msg.chat.id, `حدث خطأ: ${error.message}`);
    }
});

module.exports = bot;
