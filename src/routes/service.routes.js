const express = require('express');
const router = express.Router();
const Service = require('../models/service.model');

// GET /api/services - جلب كل الخدمات
router.get('/', async (req, res) => {
    try {
        const services = await Service.find({});
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الخدمات.' });
    }
});

// POST /api/services - إضافة خدمة جديدة
router.post('/', async (req, res) => {
    try {
        const { platform, name, pricePer1000, min, max } = req.body;
        if (!platform || !name || !pricePer1000 || !min || !max) {
            return res.status(400).json({ message: 'الرجاء ملء جميع الحقول.' });
        }
        const newService = new Service(req.body);
        await newService.save();
        res.status(201).json({ message: 'تمت إضافة الخدمة بنجاح!', service: newService });
    } catch (error) {
        res.status(500).json({ message: 'فشل إضافة الخدمة.' });
    }
});

// DELETE /api/services/:id - حذف خدمة
router.delete('/:id', async (req, res) => {
    try {
        const deletedService = await Service.findByIdAndDelete(req.params.id);
        if (!deletedService) {
            return res.status(404).json({ message: 'الخدمة غير موجودة.' });
        }
        res.status(200).json({ message: 'تم حذف الخدمة بنجاح!' });
    } catch (error) {
        res.status(500).json({ message: 'فشل حذف الخدمة.' });
    }
});

module.exports = router;
