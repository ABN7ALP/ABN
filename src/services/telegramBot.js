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
    // 1. تجاهل الرسائل التي يرسلها البوت بنفسه أو التي ليست رداً
    if (msg.from.id === botId || !msg.reply_to_message) {
        return; 
    }

    const originalMessageText = msg.reply_to_message.text || msg.reply_to_message.caption;
    if (!originalMessageText) return;

    if (originalMessageText.includes('🚨 اعتراض جديد على خصم 🚨')) {
        try {
            // ✅✅ الإصلاح: البحث عن المعرفات داخل backticks (`) ✅✅
            const orderIdMatch = originalMessageText.match(/رقم الطلب:\s*`(\w{24})`/);
            const userIdMatch = originalMessageText.match(/ID:\s*`(\w{24})`/);

            if (!orderIdMatch || !userIdMatch) {
                return bot.sendMessage(msg.chat.id, "لم أتمكن من العثور على معرف الطلب أو المستخدم في الرسالة الأصلية. تأكد من أنك ترد على الرسالة الصحيحة.");
            }


            const orderId = orderIdMatch[1];
            const userId = userIdMatch[1];
            const replyText = msg.text.trim();
            
            const order = await Order.findById(orderId).populate('user');
            if (!order) return bot.sendMessage(msg.chat.id, `الطلب رقم ${orderId} غير موجود.`);

            // منع الرد على نفس الاعتراض مرتين
            if (order.dispute.status !== 'pending') {
                return bot.sendMessage(msg.chat.id, `تمت معالجة هذا الاعتراض مسبقاً. الحالة الحالية: ${order.dispute.status}`);
            }

            if (replyText.startsWith('مقبول')) {
                // --- منطق قبول الاعتراض ---
                const fee = 0.30;
                order.user.balance += fee;
                await order.user.save();

                order.dispute.status = 'approved';
                order.dispute.adminResponse = 'تمت الموافقة على الاعتراض.';
                await order.save();

                // إرسال إشعار للمستخدم
                const notification = new Notification({
                    user: userId,
                    message: `🎉 تمت الموافقة على اعتراضك للطلب رقم ${orderId}. تم إعادة مبلغ الخصم ${fee.toFixed(2)}$ إلى رصيدك.`,
                    link: '/my-orders.html'
                });
                await notification.save();
                getIo().to(userId).emit('new-notification', { userId, notification });
                getIo().to(userId).emit('dispute-resolved', order); // إشارة لتحديث الواجهة

                bot.sendMessage(msg.chat.id, `✅ تم قبول الاعتراض وإعادة ${fee.toFixed(2)}$ إلى رصيد المستخدم ${order.user.username}.`);

            } else if (replyText.startsWith('مرفوض')) {
                // --- منطق رفض الاعتراض ---
                const reason = replyText.substring('مرفوض'.length).trim() || 'الخصم صحيح حسب سياسة الخدمة.';
                order.dispute.status = 'rejected';
                order.dispute.adminResponse = reason;
                await order.save();

                // إرسال إشعار للمستخدم
                const notification = new Notification({
                    user: userId,
                    message: `للأسف، تم رفض اعتراضك للطلب رقم ${orderId}. السبب: ${reason}`,
                    link: '/my-orders.html'
                });
                await notification.save();
                getIo().to(userId).emit('new-notification', { userId, notification });
                getIo().to(userId).emit('dispute-resolved', order); // إشارة لتحديث الواجهة

                bot.sendMessage(msg.chat.id, `❌ تم رفض الاعتراض. تم إبلاغ المستخدم بالسبب.`);

            } else {
                bot.sendMessage(msg.chat.id, 'رد غير صالح. يرجى الرد بـ "مقبول" أو "مرفوض" مع السبب.');
            }
        } catch (error) {
            console.error('Error handling dispute reply:', error);
            bot.sendMessage(msg.chat.id, `حدث خطأ فني: ${error.message}`);
        }
    }
    // يمكنك إضافة منطق الرد على رسائل الدعم الفني هنا إذا أردت
});

module.exports = bot;
