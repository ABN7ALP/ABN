// src/services/telegramBot.js

const TelegramBot = require('node-telegram-bot-api');
const SupportChat = require('../models/supportChat.model');
const User = require('../models/user.model');
require('dotenv').config();

module.exports = (getIo) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const bot = new TelegramBot(token, { polling: true });

    console.log('🤖 Telegram Bot started...');

    bot.on('message', async (msg) => {
        if (!msg.reply_to_message) {
            bot.sendMessage(msg.chat.id, "يرجى الرد على رسالة مستخدم لإرسال الإجابة.");
            return;
        }

        try {
            // استخراج معرف المستخدم من الرسالة الأصلية
            const originalText = msg.reply_to_message.text;
            const match = originalText.match(/\[ID: (\w+)\]/);

            if (!match) {
                return bot.sendMessage(msg.chat.id, "لم يتم العثور على ID المستخدم.");
            }

            const userId = match[1];
            const replyText = msg.text;

            const chat = await SupportChat.findOne({ userId });
            if (!chat) {
                return bot.sendMessage(msg.chat.id, `لا يوجد محادثة لهذا المستخدم.`);
            }

            // تسجيل الرد
            chat.messages.push({
                sender: 'support',
                text: replyText,
                timestamp: new Date()
            });
            await chat.save();

            // إرسال الرد عبر Socket.IO
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
