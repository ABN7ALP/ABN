// src/services/telegramBot.js

const TelegramBot = require('node-telegram-bot-api');
const SupportChat = require('../models/supportChat.model');
require('dotenv').config();

module.exports = (getIo) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const bot = new TelegramBot(token, { polling: true });

    console.log('🤖 Telegram Bot started...');

    bot.on('message', async (msg) => {

        // لازم الرد يكون على رسالة النظام
        if (!msg.reply_to_message) {
            return bot.sendMessage(msg.chat.id, "يرجى الرد على رسالة المستخدم فقط.");
        }

        try {
            // نحاول استخراج userId من الكابتشن أولاً (أقوى طريقة)
            let userId = null;

            if (msg.reply_to_message.caption && msg.reply_to_message.caption.startsWith("USER_ID:")) {
                userId = msg.reply_to_message.caption.replace("USER_ID:", "").trim();
            }

            // احتياط: في حال بعض الأنظمة ترسل بالـ text
            if (!userId && msg.reply_to_message.text?.includes("USER_ID:")) {
                userId = msg.reply_to_message.text.split("USER_ID:")[1].trim();
            }

            // إذا مافي userId → نوقف
            if (!userId) {
                return bot.sendMessage(msg.chat.id, "لم يتم العثور على ID المستخدم.");
            }

            const replyText = msg.text;

            const chat = await SupportChat.findOne({ userId });
            if (!chat) {
                return bot.sendMessage(msg.chat.id, "لا يوجد محادثة لهذا المستخدم.");
            }

            // حفظ الرد بالمحادثة
            chat.messages.push({
                sender: 'support',
                text: replyText,
                timestamp: new Date()
            });
            await chat.save();

            // إرسال الرد عبر socket.io
            const io = getIo();
            io.to(userId).emit('support-reply', {
                userId,
                message: replyText,
                timestamp: new Date()
            });

            bot.sendMessage(msg.chat.id, "✔ تم إرسال الرد للمستخدم.");

        } catch (err) {
            console.error(err);
            bot.sendMessage(msg.chat.id, `خطأ: ${err.message}`);
        }
    });

    return bot;
};
