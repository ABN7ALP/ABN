const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const SupportChat = require('../models/supportChat.model');
const Order = require('../models/order.model');
const Deposit = require('../models/deposit.model');
const User = require('../models/user.model');
const bot = require('../services/telegramBot'); // هاد ما عاد نحتاجه لأنه اشتغل من السيرفر

router.post('/chat', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message) return res.status(400).json({ message: 'الرسالة مطلوبة' });

    try {
        let chat = await SupportChat.findOne({ userId });
        let initialMessage = message;

        if (!chat) {
            // إنشاء محادثة جديدة
            const lastOrder = await Order.findOne({ user: userId }).sort({ createdAt: -1 });
            const lastDeposit = await Deposit.findOne({ user: userId }).sort({ createdAt: -1 });

            let summary = "لا يوجد نشاط سابق.";

            if (lastOrder || lastDeposit) {
                if (lastOrder && (!lastDeposit || lastOrder.createdAt > lastDeposit.createdAt)) {
                    summary = `آخر طلب خدمة: ${lastOrder.service} — ${lastOrder.status}`;
                } else {
                    summary = `آخر عملية شحن: ${lastDeposit.amount}$ — ${lastDeposit.status}`;
                }
            }

            initialMessage = `--- ملخص تلقائي ---\n${summary}\n---------------------\n\n${message}`;

            chat = new SupportChat({ userId, messages: [] });
        }

        chat.messages.push({
            sender: 'user',
            text: message,
            timestamp: new Date()
        });

        await chat.save();

        // إرسال إلى التليجرام
        const user = await User.findById(userId);
        const telegramMessage = `*رسالة جديدة من ${user.username}*\n[ID: ${userId}]\n\n${initialMessage}`;

        global.telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, telegramMessage, { parse_mode: "Markdown" });

        return res.status(201).json({ message: "تم إرسال الرسالة" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "خطأ في الخادم" });
    }
});

module.exports = router;
