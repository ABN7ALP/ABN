const express = require('express');
const router = express.Router();
const { 
    getQueueStats, 
    cleanOldQueues, 
    checkRedisConnection 
} = require('../services/queue');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// GET /api/queue/stats - إحصائيات الطابور
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const stats = await getQueueStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting queue stats:', error);
        res.status(500).json({ message: 'فشل جلب إحصائيات الطابور' });
    }
});

// POST /api/queue/clean - تنظيف الطوابير القديمة
router.post('/clean', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const days = req.body.days || 7;
        await cleanOldQueues(days);
        res.json({ message: `تم تنظيف الطوابير الأقدم من ${days} يوم` });
    } catch (error) {
        console.error('Error cleaning queues:', error);
        res.status(500).json({ message: 'فشل تنظيف الطوابير' });
    }
});

// GET /api/queue/health - فحص صحة Redis
router.get('/health', async (req, res) => {
    try {
        const { checkRedisConnection } = require('../services/queue');
        const isConnected = await checkRedisConnection();
        res.json({ 
            redis: isConnected ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString(),
            url: process.env.REDIS_URL ? 'محدد' : 'غير محدد'
        });
    } catch (error) {
        res.status(500).json({ 
            redis: 'error', 
            message: error.message 
        });
    }
});
module.exports = router;
