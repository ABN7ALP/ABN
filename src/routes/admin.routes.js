const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// تطبيق middleware للأمان
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/users - جلب جميع المستخدمين
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({})
            .select('-password -emailVerificationToken -resetPasswordToken')
            .sort({ createdAt: -1 });
        
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'فشل جلب المستخدمين' });
    }
});

// GET /api/admin/users/emails - تصدير الإيميلات
router.get('/users/emails', async (req, res) => {
    try {
        const users = await User.find({ emailVerified: true })
            .select('email username createdAt')
            .sort({ createdAt: -1 });
        
        // تحويل إلى CSV
        const csvData = users.map(user => 
            `"${user.email}","${user.username}","${new Date(user.createdAt).toLocaleDateString('ar-EG')}"`
        ).join('\n');
        
        const csv = 'البريد الإلكتروني,اسم المستخدم,تاريخ التسجيل\n' + csvData;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=users_emails.csv');
        res.send(csv);
        
    } catch (error) {
        console.error('Error exporting emails:', error);
        res.status(500).json({ message: 'فشل تصدير الإيميلات' });
    }
});

module.exports = router;
