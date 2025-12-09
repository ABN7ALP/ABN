const TelegramBot = require('node-telegram-bot-api');
const SupportChat = require('../models/supportChat.model');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model')

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


// ==========================================================
// 🚀🚀 معالج ضغطات الأزرار التفاعلية (Callback Query) 🚀🚀
// ==========================================================
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data; // e.g., "dispute_approve_60d21b4667d0d8992e610c85"
    const [actionType, action, orderId] = data.split('_');

    if (actionType !== 'dispute') return;

    try {
        const order = await Order.findById(orderId).populate('user');
        if (!order) {
            return bot.answerCallbackQuery(callbackQuery.id, { text: 'الطلب لم يعد موجوداً.' });
        }
        if (order.dispute.status !== 'pending') {
            return bot.answerCallbackQuery(callbackQuery.id, { text: `تمت معالجة هذا الاعتراض مسبقاً. الحالة: ${order.dispute.status}` });
        }

        const fee = 0.30;
        const userId = order.user.id;

        if (action === 'approve') {
            // --- منطق قبول الاعتراض ---
            order.user.balance += fee;
            await order.user.save();

            order.dispute.status = 'approved';
            order.dispute.adminResponse = 'تمت الموافقة على الاعتراض.';
            await order.save();

            const notification = new Notification({
                user: userId,
                message: `🎉 تمت الموافقة على اعتراضك للطلب رقم ${orderId}. تم إعادة مبلغ الخصم ${fee.toFixed(2)}$ إلى رصيدك.`,
                link: '/my-orders.html'
            });
            await notification.save();
            getIo().to(userId).emit('new-notification', { userId, notification });
            getIo().to(userId).emit('dispute-resolved', order);

            bot.editMessageText(`✅ تم قبول الاعتراض للطلب \`${orderId}\`.\nتم إعادة ${fee.toFixed(2)}$ إلى رصيد المستخدم ${order.user.username}.`, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                parse_mode: 'Markdown'
            });
            bot.answerCallbackQuery(callbackQuery.id, { text: 'تم قبول الاعتراض بنجاح!' });

        } else if (action === 'reject') {
            // --- منطق رفض الاعتراض ---
            // عند الرفض، سنطلب من المدير إدخال السبب
            bot.sendMessage(msg.chat.id, `يرجى إدخال سبب رفض الاعتراض للطلب \`${orderId}\` كرد (Reply) على هذه الرسالة.`, {
                parse_mode: 'Markdown',
                reply_markup: { force_reply: true } // يجبر المدير على الرد
            }).then(sentMessage => {
                // تسجيل مستمع لمرة واحدة فقط للرد على هذه الرسالة
                bot.onReplyToMessage(sentMessage.chat.id, sentMessage.message_id, async (replyMsg) => {
                    const reason = replyMsg.text || 'الخصم صحيح حسب سياسة الخدمة.';
                    order.dispute.status = 'rejected';
                    order.dispute.adminResponse = reason;
                    await order.save();

                    const notification = new Notification({
                        user: userId,
                        message: `للأسف، تم رفض اعتراضك للطلب رقم ${orderId}. السبب: ${reason}`,
                        link: '/my-orders.html'
                    });
                    await notification.save();
                    getIo().to(userId).emit('new-notification', { userId, notification });
                    getIo().to(userId).emit('dispute-resolved', order);

                    bot.editMessageText(`❌ تم رفض الاعتراض للطلب \`${orderId}\`.\nالسبب: ${reason}`, {
                        chat_id: msg.chat.id,
                        message_id: msg.message_id,
                        parse_mode: 'Markdown'
                    });
                });
            });
            bot.answerCallbackQuery(callbackQuery.id, { text: 'الآن أدخل سبب الرفض.' });
        }
    } catch (error) {
        console.error('Callback query error:', error);
        bot.answerCallbackQuery(callbackQuery.id, { text: `حدث خطأ: ${error.message}` });
    }
});



module.exports = bot;
