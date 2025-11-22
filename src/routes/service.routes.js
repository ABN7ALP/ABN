const express = require('express');
const router = express.Router();
const Service = require('../models/service.model');

// --- جلب كل الخدمات ---
router.get('/', async (req, res) => {
    try {
        const services = await Service.find({});
        res.status(200).json(services);
    } catch (error) {
        console.error("GET /api/services error:", error);
        res.status(500).json({ message: 'فشل جلب الخدمات.', error: error.message });
    }
});

// --- إضافة خدمة جديدة ---
router.post('/', async (req, res) => {
    try {
        const { platform, name, pricePer1000, min, max } = req.body;

        // تحقق من وجود الحقول والتحويل الصحيح للأرقام
        if (!platform || !name || isNaN(pricePer1000) || isNaN(min) || isNaN(max)) {
            return res.status(400).json({ message: 'الرجاء ملء جميع الحقول بشكل صحيح.' });
        }

        const newService = new Service({
            platform: platform.trim(),
            name: name.trim(),
            pricePer1000: Number(pricePer1000),
            min: Number(min),
            max: Number(max)
        });

        await newService.save();

        res.status(201).json({ message: 'تمت إضافة الخدمة بنجاح!', service: newService });

    } catch (error) {
        // طباعة الخطأ بالكامل في الكونسل
        console.error("POST /api/services error:", error);

        // إعادة رسالة الخطأ للمطور فقط (يمكنك حذفها عند نشر المشروع)
        res.status(500).json({ message: 'فشل إضافة الخدمة.', error: error.message });
    }
});

// --- حذف خدمة ---
router.delete('/:id', async (req, res) => {
    try {
        const deletedService = await Service.findByIdAndDelete(req.params.id);
        if (!deletedService) {
            return res.status(404).json({ message: 'الخدمة غير موجودة.' });
        }
        res.status(200).json({ message: 'تم حذف الخدمة بنجاح!' });
    } catch (error) {
        console.error("DELETE /api/services/:id error:", error);
        res.status(500).json({ message: 'فشل حذف الخدمة.', error: error.message });
    }
});

// --- تعديل خدمة ---
router.put('/:id', async (req, res) => {
    try {
        const { platform, name, pricePer1000, min, max } = req.body;

        if (!platform || !name || isNaN(pricePer1000) || isNaN(min) || isNaN(max)) {
            return res.status(400).json({ message: 'الرجاء ملء جميع الحقول بشكل صحيح.' });
        }

        const updatedService = await Service.findByIdAndUpdate(
            req.params.id,
            {
                platform: platform.trim(),
                name: name.trim(),
                pricePer1000: Number(pricePer1000),
                min: Number(min),
                max: Number(max)
            },
            { new: true, runValidators: true }
        );

        if (!updatedService) {
            return res.status(404).json({ message: 'الخدمة غير موجودة.' });
        }

        res.status(200).json({ message: 'تم تعديل الخدمة بنجاح!', service: updatedService });

    } catch (error) {
        console.error("PUT /api/services/:id error:", error);
        res.status(500).json({ message: 'فشل تعديل الخدمة.', error: error.message });
    }
});

module.exports = router;
