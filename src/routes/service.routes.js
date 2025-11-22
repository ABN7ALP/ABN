const express = require('express');
const router = express.Router();
const Service = require('../models/service.model');
const { v4: uuidv4 } = require('uuid');

// --- GET كل الخدمات ---
router.get('/', async (req, res) => {
    try {
        const services = await Service.find({});
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الخدمات.' });
    }
});

// --- POST إضافة خدمة جديدة ---
router.post('/', async (req, res) => {
    try {
        const { platform, name, pricePer1000, min, max } = req.body;
        if (!platform || !name || isNaN(pricePer1000) || isNaN(min) || isNaN(max)) {
            return res.status(400).json({ message: 'الرجاء ملء جميع الحقول بشكل صحيح.' });
        }
        const newService = new Service({ id: uuidv4(), platform, name, pricePer1000, min, max });
        await newService.save();
        
        // إرسال إشعار بالتحديث الفوري
        req.io.emit('new-service');

        res.status(201).json({ message: 'تمت إضافة الخدمة بنجاح!', service: newService });
    } catch (error) {
        res.status(500).json({ message: 'فشل إضافة الخدمة.', error: error.message });
    }
});

// --- DELETE حذف خدمة ---
router.delete('/:id', async (req, res) => {
    try {
        const deletedService = await Service.findOneAndDelete({ id: req.params.id });
        if (!deletedService) return res.status(404).json({ message: 'الخدمة غير موجودة.' });
        
        // إرسال إشعار بالتحديث الفوري
        req.io.emit('new-service');

        res.status(200).json({ message: 'تم حذف الخدمة بنجاح!' });
    } catch (error) {
        res.status(500).json({ message: 'فشل حذف الخدمة.' });
    }
});

// --- PUT تعديل خدمة ---
router.put('/:id', async (req, res) => {
    try {
        const { platform, name, pricePer1000, min, max } = req.body;
        const updatedService = await Service.findOneAndUpdate({ id: req.params.id }, { platform, name, pricePer1000, min, max }, { new: true });
        if (!updatedService) return res.status(404).json({ message: 'الخدمة غير موجودة.' });
        
        // إرسال إشعار بالتحديث الفوري
        req.io.emit('new-service');

        res.status(200).json({ message: 'تم تعديل الخدمة بنجاح!', service: updatedService });
    } catch (error) {
        res.status(500).json({ message: 'فشل تعديل الخدمة.', error: error.message });
    }
});

module.exports = router;
