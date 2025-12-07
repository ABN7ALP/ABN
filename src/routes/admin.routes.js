const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const validateObjectId = require('../middleware/objectId.middleware');


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
// GET /api/admin/users/emails - تصدير الإيميلات
router.get('/users/emails', async (req, res) => {
    try {
        const users = await User.find({ emailVerified: true })
            .select('email username createdAt balance')
            .sort({ createdAt: -1 });
        
        // تحسين تنسيق CSV
        const csvData = users.map(user => 
            `"${user.email}","${user.username}","${user.balance || 0}","${new Date(user.createdAt).toLocaleDateString('ar-EG')}"`
        ).join('\n');
        
        const csv = 'البريد الإلكتروني,اسم المستخدم,الرصيد,تاريخ التسجيل\n' + csvData;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=users_emails_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\uFEFF' + csv); // إضافة BOM للدعم الكامل للعربية
        
    } catch (error) {
        console.error('Error exporting emails:', error);
        res.status(500).json({ message: 'فشل تصدير الإيميلات' });
    }
});

// 🆕 إضافة route لتحديث بيانات المستخدم
router.put('/users/:id', validateObjectId('id'), async (req, res) => {
    try {
        const { username, email, balance, emailVerified, isAdmin } = req.body;

        // ⚠️ بدك تعرّفي هدول المتغيرين قبل اللوق
        const adminUserId = req.user ? req.user._id : 'UNKNOWN';
        const targetUserId = req.params.id;

        const updatedUser = await User.findByIdAndUpdate(
            targetUserId,
            {
                username,
                email,
                balance,
                emailVerified,
                isAdmin
            },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }

        console.log(
            `SECURITY: Admin (ID: ${adminUserId}) updated user (ID: ${targetUserId}). ` +
            `New data: username=${username}, email=${email}, balance=${balance}, isAdmin=${isAdmin}`
        );

        return res.json({
            message: 'تم تحديث بيانات المستخدم بنجاح',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'فشل تحديث بيانات المستخدم' });
    }
});

module.exports = router;
