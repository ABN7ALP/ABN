const express = require('express');
const router = express.Router();
const Order = require('../models/order.model');

// POST /api/orders - إنشاء طلب جديد
router.post('/', async (req, res) => {
  try {
    const { platform, service, link, quantity, price } = req.body;
    if (!platform || !service || !link || !quantity || !price) {
      return res.status(400).json({ message: 'بيانات الطلب غير مكتملة.' });
    }
    const newOrder = new Order({ platform, service, link, quantity, price });
    const savedOrder = await newOrder.save();
    res.status(201).json({ message: 'تم استلام طلبك بنجاح!', orderId: savedOrder._id });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم.' });
  }
});

// GET /api/orders - جلب كل الطلبات
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم.' });
    }
});

// --- المسار الجديد لتحديث الطلب ---
// PUT /api/orders/:id - تحديث حالة طلب معين
router.put('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        if (!status) {
            return res.status(400).json({ message: 'الحالة الجديدة مطلوبة.' });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            id, 
            { status: status },
            { new: true } // لإرجاع المستند بعد التحديث
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'الطلب غير موجود.' });
        }

        res.status(200).json({ message: 'تم تحديث حالة الطلب بنجاح!', order: updatedOrder });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم.' });
    }
});


module.exports = router;
