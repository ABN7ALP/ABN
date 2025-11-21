const express = require('express');
const router = express.Router();
const Order = require('../models/order.model');

// POST /api/orders - إنشاء طلب جديد
router.post('/', async (req, res) => {
  try {
    const { platform, service, link, quantity, price } = req.body;

    // التحقق من وجود البيانات المطلوبة
    if (!platform || !service || !link || !quantity || !price) {
      return res.status(400).json({ message: 'الرجاء إدخال جميع الحقول المطلوبة.' });
    }

    const newOrder = new Order({
      platform,
      service,
      link,
      quantity,
      price
    });

    await newOrder.save();

    // هنا سنضيف لاحقاً كود إرسال إشعار واتساب

    res.status(201).json({ message: 'تم استلام طلبك بنجاح!', order: newOrder });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء معالجة طلبك.' });
  }
});

// يمكنك إضافة مسارات أخرى هنا مستقبلاً (مثل جلب كل الطلبات للوحة التحكم)

module.exports = router;
