const express = require('express');
const router = express.Router();
const Order = require('../models/order.model');

// POST /api/orders - إنشاء طلب جديد
router.post('/', async (req, res) => {
  try {
    const { platform, service, link, quantity, price } = req.body;

    // التحقق من أن جميع البيانات المطلوبة موجودة وسليمة
    if (!platform || !service || !link || !quantity || !price) {
      return res.status(400).json({ message: 'بيانات الطلب غير مكتملة. الرجاء ملء جميع الحقول.' });
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ message: 'الكمية يجب أن تكون رقماً أكبر من صفر.' });
    }

    const newOrder = new Order({
      platform,
      service,
      link,
      quantity,
      price
      // ملاحظة: حالة الطلب (status) وتاريخ الإنشاء (createdAt) يتم تعيينها تلقائياً حسب الـ model
    });

    // حفظ الطلب في قاعدة البيانات
    const savedOrder = await newOrder.save();

    // هنا سنضيف لاحقاً كود إرسال إشعار واتساب

    // إرسال رد ناجح إلى الواجهة الأمامية
    res.status(201).json({ message: 'تم استلام طلبك بنجاح وسيتم مراجعته قريباً!', orderId: savedOrder._id });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم أثناء معالجة طلبك. الرجاء المحاولة لاحقاً.' });
  }
});

// GET /api/orders - لجلب كل الطلبات (سنستخدمها لاحقاً في لوحة التحكم)
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }); // جلب الطلبات مرتبة من الأحدث للأقدم
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء جلب الطلبات.' });
    }
});


module.exports = router;
