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
// ✅ في admin.routes.js - عدل دالة تحديث المستخدم
router.put('/users/:id', async (req, res) => {
    try {
        const { username, email, balance, emailVerified, isAdmin } = req.body;
        
        // 🆕 التحقق من صحة البيانات
        if (balance !== undefined) {
            if (typeof balance !== 'number' || balance < 0 || balance > 100000) {
                return res.status(400).json({ 
                    message: 'قيمة الرصيد غير صالحة. يجب أن تكون بين 0 و 100000' 
                });
            }
        }
        
        if (username && (username.length < 3 || username.length > 30)) {
            return res.status(400).json({ 
                message: 'اسم المستخدم يجب أن يكون بين 3 و 30 حرفاً' 
            });
        }
        
        if (email && !/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({ 
                message: 'البريد الإلكتروني غير صالح' 
            });
        }
        
        // 🆕 منع المستخدم من جعل نفسه غير مدير
        if (req.user._id.toString() === req.params.id && isAdmin === false) {
            return res.status(400).json({ 
                message: 'لا يمكنك إزالة صلاحيات المدير من نفسك' 
            });
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
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
        
        res.json({ message: 'تم تحديث بيانات المستخدم بنجاح', user: updatedUser });
        
        
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            message: 'فشل تحديث بيانات المستخدم',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
