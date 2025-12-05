const TelegramBot = require('node-telegram-bot-api');
const SupportChat = require('./models/supportChat.model');
// ... (كود إرسال الرد إلى المستخدم عبر Socket.IO)

const token = 'YOUR_TELEGRAM_BOT_TOKEN';
const bot = new TelegramBot(token, { polling: true });

bot.on('message', async (msg) => {
    // منطق الرد على رسالة المستخدم
    if (msg.reply_to_message) {
        const originalMessage = msg.reply_to_message.text;
        const userId = originalMessage.match(/\[ID: (\w+)\]/)[1];
        const replyText = msg.text;

        // حفظ الرد في قاعدة البيانات وإرساله للمستخدم
    }
});

module.exports = bot;
