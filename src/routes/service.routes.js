const express = require('express');
const router = express.Router();
const Service = require('../models/service.model');
const { v4: uuidv4 } = require('uuid');
// ******** إضافة جديدة ********
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
// ****************************

// GET كل الخدمات
router.get('/', async (req, res) => {
    try {
        const services = await Service.find({});
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الخدمات.' });
    }
});

// POST إضافة خدمة جديدة (الآن محمي)
  router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const newService = new Service({ id: uuidv4(), ...req.body });
        await newService.save();

        // *** إرسال إشارة التحديث الفوري ***
        req.io.emit('new-service');

        res.status(201).json({ message: 'تمت إضافة الخدمة بنجاح!' });
    } catch (error) {
        res.status(500).json({ message: 'فشل إضافة الخدمة.' });
    }
});

// DELETE حذف خدمة
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Service.findOneAndDelete({ id: req.params.id });

        // *** إرسال إشارة التحديث الفوري ***
        req.io.emit('service-deleted');

        res.status(200).json({ message: 'تم حذف الخدمة بنجاح!' });
    } catch (error) {
        res.status(500).json({ message: 'فشل حذف الخدمة.' });
    }
});

// PUT تعديل خدمة
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Service.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });

        // *** إرسال إشارة التحديث الفوري ***
        req.io.emit('service-updated');

        res.status(200).json({ message: 'تم تعديل الخدمة بنجاح!' });
    } catch (error) {
        res.status(500).json({ message: 'فشل تعديل الخدمة.' });
    }
});

module.exports = router;
