const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const SupportChat = require('../models/supportChat.model');
const Order = require('../models/order.model');
const Deposit = require('../models/deposit.model');
const User = require('../models/user.model');
const bot = require('../services/telegramBot');

// ===================================================================
// 🎯 1. المسار الجديد: جلب سجل المحادثة (GET)
// ===================================================================
router.get('/chat', authMiddleware, async (req, res) => {
    try {
        const chat = await SupportChat.findOne({ userId: req.user.id });
        if (!chat) {
            // إذا لم تكن هناك محادثة، أرسل كائن فارغ بدلاً من خطأ
            return res.status(200).json({ messages: [] });
        }
        res.status(200).json(chat);
    } catch (error) {
        console.error('Error fetching support chat:', error);
        res.status(500).json({ message: 'خطأ في الخادم عند جلب المحادثة' });
    }
});

// ===================================================================
// 2. المسار القديم: إرسال رسالة جديدة (POST) - يبقى كما هو
// ===================================================================
router.post('/chat', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ message: 'الرسالة لا يمكن أن تكون فارغة' });
    }

    try {
        let chat = await SupportChat.findOne({ userId });
        let isFirstMessage = !chat;
        let initialMessage = message;

        if (isFirstMessage) {
            const lastOrder = await Order.findOne({ user: userId }).sort({ createdAt: -1 });
            const lastDeposit = await Deposit.findOne({ user: userId }).sort({ createdAt: -1 });

            let summary = "المستخدم ليس لديه أي نشاط سابق.";
            if (lastOrder || lastDeposit) {
                if (lastOrder && (!lastDeposit || lastOrder.createdAt > lastDeposit.createdAt)) {
                    summary = `آخر نشاط: طلب خدمة "${lastOrder.service}" بحالة "${lastOrder.status}".`;
                } else if (lastDeposit) {
                    summary = `آخر نشاط: طلب شحن رصيد بقيمة ${lastDeposit.amount}$ بحالة "${lastDeposit.status}".`;
                }
            }
            
            initialMessage = `--- ملخص تلقائي ---\n${summary}\n---------------------\n\n${message}`;
            chat = new SupportChat({ userId, messages: [] });
        }

        chat.messages.push({ sender: 'user', text: message });
        await chat.save();

        const user = await User.findById(userId).select('username');
        const telegramMessage = `*رسالة جديدة من ${user.username}*\nID: ${userId}\n\n${initialMessage}`;
        
        bot.sendMessage(process.env.TELEGRAM_CHAT_ID, telegramMessage, { parse_mode: 'Markdown' });

        res.status(201).json({ message: 'تم إرسال الرسالة بنجاح' });

    } catch (error) {
        console.error('Support chat error:', error);
        res.status(500).json({ message: 'خطأ في الخادم' });
    }
});

module.exports = router;
