const TelegramBot = require('node-telegram-bot-api');
const SupportChat = require('../models/supportChat.model');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model')

const { getIo } = require('../config/socket');
require('dotenv').config();

let bot;
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.warn('⚠️ تحذير: توكن بوت التلغرام غير موجود. سيتم تعطيل ميزات التلغرام.');
    // إنشاء كائن "وهمي" لمنع توقف التطبيق
    bot = {
        sendMessage: (chatId, text) => console.warn(`[Bot الوهمي] لا يمكن إرسال رسالة: ${text}`),
        sendPhoto: (chatId, photo) => console.warn(`[Bot الوهمي] لا يمكن إرسال صورة.`),
        on: () => {},
        answerCallbackQuery: () => Promise.resolve(),
        editMessageText: () => Promise.resolve(),
        getFileLink: () => Promise.resolve(''),
        getMe: () => Promise.resolve({ id: 'disabled-bot', first_name: 'Disabled' })
    };

} else {
    // إذا كان التوكن موجوداً، قم بإنشاء البوت الحقيقي
    bot = new TelegramBot(token, { polling: true });

    let botId = null;
    bot.getMe().then((me) => {
        botId = me.id;
        console.log(`🤖 Telegram Bot "${me.first_name}" started (ID: ${botId})`);
    }).catch(err => {
        console.error("خطأ فادح: لم يتمكن من الحصول على معلومات البوت. تحقق من التوكن والشبكة.", err);
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
// 🔽🔽 استبدل معالج bot.on('callback_query', ...) بالكامل بهذا الكود النهائي 🔽🔽

bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data; // e.g., "dispute_approve_ORDERID" or "reason_private_ORDERID"
    const [type, action, orderId] = data.split('_');

    try {
        // --- الجزء الأول: التعامل مع القبول أو الرفض الأولي ---
        if (type === 'dispute') {
            const order = await Order.findById(orderId);
            if (!order || order.dispute.status !== 'pending') {
                return bot.answerCallbackQuery(callbackQuery.id, { text: 'تمت معالجة هذا الاعتراض مسبقاً.' });
            }

            if (action === 'approve') {
                // --- منطق قبول الاعتراض (يبقى كما هو) ---
                const user = await User.findById(order.user);
                const fee = 0.30;
                user.balance += fee;
                await user.save();

                order.dispute.status = 'approved';
                order.dispute.adminResponse = 'تمت الموافقة على الاعتراض.';
                await order.save();

                // ... (كود إرسال الإشعارات يبقى كما هو) ...
                const notification = new Notification({ user: order.user, message: `🎉 تمت الموافقة على اعتراضك وتمت إعادة ${fee.toFixed(2)}$ لرصيدك.`, link: '/my-orders.html' });
                await notification.save();
                getIo().to(order.user.toString()).emit('new-notification', { userId: order.user.toString(), notification });
                getIo().to(order.user.toString()).emit('dispute-resolved', order);

                bot.editMessageText(`✅ تم قبول الاعتراض للطلب \`${orderId}\`.`, { chat_id: msg.chat.id, message_id: msg.message_id, parse_mode: 'Markdown' });
                return bot.answerCallbackQuery(callbackQuery.id, { text: 'تم قبول الاعتراض!' });

            } else if (action === 'reject') {
                // --- 🚀🚀 المنطق الجديد: عرض أزرار أسباب الرفض 🚀🚀 ---
                bot.editMessageText(msg.text + '\n\n*الرجاء تحديد سبب الرفض:*', {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔒 حساب خاص', callback_data: `reason_private_${orderId}` }],
                            [{ text: '🔗 رابط خاطئ', callback_data: `reason_link_${orderId}` }],
                            [{ text: '📝 سبب آخر (عام)', callback_data: `reason_other_${orderId}` }]
                        ]
                    }
                });
                return bot.answerCallbackQuery(callbackQuery.id);
            }
        }

        // --- الجزء الثاني: التعامل مع اختيار سبب الرفض ---
        if (type === 'reason') {
            const order = await Order.findById(orderId).populate('user');
            if (!order || order.dispute.status !== 'pending') {
                return bot.answerCallbackQuery(callbackQuery.id, { text: 'تمت معالجة هذا الاعتراض مسبقاً.' });
            }

            let reasonText = '';
            if (action === 'private') {
                reasonText = 'الحساب كان خاصاً وقت التحقق.';
            } else if (action === 'link') {
                reasonText = 'الرابط المقدم غير صحيح أو لا يعمل.';
            } else {
                reasonText = 'الخصم صحيح حسب سياسة الخدمة.';
            }

            order.dispute.status = 'rejected';
            order.dispute.adminResponse = reasonText;
            await order.save();

            // إرسال إشعار للمستخدم
            const notification = new Notification({
                user: order.user.id,
                message: `للأسف، تم رفض اعتراضك. السبب: ${reasonText}`,
                link: '/my-orders.html'
            });
            await notification.save();
            getIo().to(order.user.id.toString()).emit('new-notification', { userId: order.user.id.toString(), notification });
            getIo().to(order.user.id.toString()).emit('dispute-resolved', order);

            bot.editMessageText(`❌ تم رفض الاعتراض للطلب \`${orderId}\`.\n*السبب:* ${reasonText}`, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                parse_mode: 'Markdown'
            });
            return bot.answerCallbackQuery(callbackQuery.id, { text: 'تم تسجيل سبب الرفض!' });
        }

    } catch (error) {
        console.error('Callback query error:', error);
        bot.answerCallbackQuery(callbackQuery.id, { text: `حدث خطأ: ${error.message}` });
    }
});



module.exports = bot;
