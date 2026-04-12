const express = require('express');
const router = express.Router();
const Banner = require('../models/banner.model');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const UploadService = require('../services/uploadService');

// GET - جلب البانرات النشطة
router.get('/active', async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ order: 1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب البانرات' });
    }
});

// GET - جلب كل البانرات (إدمن)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const banners = await Banner.find({}).sort({ order: 1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب البانرات' });
    }
});

// POST - إضافة بانر
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { imageBase64, link, title, order } = req.body;
        
        if (!imageBase64) return res.status(400).json({ message: 'الصورة مطلوبة' });
        
        const uploadResult = await UploadService.uploadImage(imageBase64, 'banners');
        if (!uploadResult.success) {
            return res.status(500).json({ message: 'فشل رفع الصورة' });
        }
        
        const banner = await Banner.create({
            imageUrl: uploadResult.url,
            link: link || '#',
            title: title || '',
            order: order || 0
        });
        
        res.status(201).json({ message: 'تم إضافة البانر', banner });
    } catch (error) {
        res.status(500).json({ message: 'فشل إضافة البانر' });
    }
});

// PUT - تعديل بانر
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const updated = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ message: 'تم تعديل البانر', banner: updated });
    } catch (error) {
        res.status(500).json({ message: 'فشل تعديل البانر' });
    }
});

// DELETE - حذف بانر
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Banner.findByIdAndDelete(req.params.id);
        res.json({ message: 'تم حذف البانر' });
    } catch (error) {
        res.status(500).json({ message: 'فشل حذف البانر' });
    }
});

module.exports = router;
