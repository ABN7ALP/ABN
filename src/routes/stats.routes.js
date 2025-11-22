const express = require('express');
const router = express.Router();
const Order = require('../models/order.model.js');

// GET /api/stats - جلب الإحصائيات الرئيسية
router.get('/', async (req, res) => {
    try {
        // حساب إجمالي الدخل من الطلبات المكتملة
        const totalRevenueResult = await Order.aggregate([
            { $match: { status: 'مكتمل' } }, // فقط الطلبات المكتملة
            { $group: { _id: null, total: { $sum: '$price' } } } // جمع حقل السعر
        ]);
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

        // حساب عدد الطلبات حسب كل حالة
        const statusCountsResult = await Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // تحويل نتيجة العد إلى شكل أسهل للاستخدام
        const statusCounts = statusCountsResult.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        // حساب إجمالي عدد الطلبات
        const totalOrders = await Order.countDocuments();

        // تجميع كل الإحصائيات في كائن واحد
        const stats = {
            totalRevenue: totalRevenue,
            totalOrders: totalOrders,
            completedOrders: statusCounts['مكتمل'] || 0,
            pendingOrders: (statusCounts['قيد المراجعة'] || 0) + (statusCounts['قيد التنفيذ'] || 0),
        };

        res.status(200).json(stats);

    } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({ message: 'فشل جلب الإحصائيات.' });
    }
});

module.exports = router;
