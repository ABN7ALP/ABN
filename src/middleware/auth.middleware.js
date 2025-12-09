// 🔽🔽 استبدل الملف بالكامل بهذا الكود 🔽🔽

const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); 

const authMiddleware = async (req, res, next) => {
    let token;

    // 1. التحقق من وجود التوكن في الهيدر
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'غير مصرح لك، لا يوجد توكن.' }); 
    }

    // 2. التحقق من صحة التوكن وجلب بيانات المستخدم
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // جلب المستخدم من قاعدة البيانات وتخزينه في الطلب
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ message: 'المستخدم غير موجود.' });
        }
        
        // 3. الانتقال إلى الـ middleware أو المسار التالي
        next(); 

    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'التوكن غير صالح أو منتهي الصلاحية.' });
    }
};

module.exports = authMiddleware;
