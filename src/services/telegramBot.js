const TelegramBot = require('node-telegram-bot-api');
const SupportChat = require('./models/supportChat.model');
const User = require('./models/user.model');

// تحميل المتغيرات من .env
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Telegram Bot has been started...');

// الاستماع للرسائل الواردة إلى البوت
bot.on('message', async (msg) => {
    // تجاهل الرسائل التي ليست رداً
    if (!msg.reply_to_message) {
        bot.sendMessage(msg.chat.id, "يرجى الرد على رسالة مستخدم محددة لإرسال إجابتك.");
        return;
    }

    try {
        // استخراج معرف المستخدم من الرسالة الأصلية
        const originalMessage = msg.reply_to_message.text;
        const match = originalMessage.match(/\[ID: (\w+)\]/);
        
        if (!match || !match[1]) {
            bot.sendMessage(msg.chat.id, "لم أتمكن من العثور على معرف المستخدم في الرسالة الأصلية.");
            return;
        }
        const userId = match[1];
        const replyText = msg.text;

        // العثور على محادثة المستخدم
        const chat = await SupportChat.findOne({ userId });
        if (!chat) {
            bot.sendMessage(msg.chat.id, `لا توجد محادثة نشطة للمستخدم بالمعرف: ${userId}`);
            return;
        }

        // إضافة رد الدعم إلى قاعدة البيانات
        chat.messages.push({
            sender: 'support',
            text: replyText,
            timestamp: new Date()
        });
        await chat.save();

        // إرسال الرد إلى المستخدم عبر Socket.IO
        // (سنحتاج إلى تصدير `io` من الملف الرئيسي)
        const { getIo } = require('../server'); // تأكد من صحة المسار
        const io = getIo();
        io.to(userId).emit('support-reply', {
            userId: userId,
            message: replyText,
            timestamp: new Date()
        });

        bot.sendMessage(msg.chat.id, `✅ تم إرسال ردك بنجاح إلى المستخدم.`);

    } catch (error) {
        console.error('Error handling Telegram reply:', error);
        bot.sendMessage(msg.chat.id, `حدث خطأ: ${error.message}`);
    }
});

module.exports = bot;
