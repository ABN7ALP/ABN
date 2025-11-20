const multer = require('multer');
const path = require('path');

// إعداد مساحة التخزين (Storage Engine)
const storage = multer.diskStorage({
    // تحديد المجلد الذي سيتم حفظ الملفات فيه
    destination: './public/uploads/',
    // تحديد اسم الملف عند حفظه
    filename: function(req, file, cb) {
        // ننشئ اسماً فريداً للملف لتجنب تضارب الأسماء
        // الاسم سيكون: 'user-' + id_المستخدم + '-' + الوقت_الحالي + امتداد_الملف_الأصلي
        const uniqueName = 'user-' + req.session.user.id + '-' + Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// دالة للتحقق من نوع الملف (فلترة الملفات)
function checkFileType(file, cb) {
    // الامتدادات المسموح بها (صور فقط)
    const filetypes = /jpeg|jpg|png|gif/;
    // التحقق من امتداد الملف
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // التحقق من نوع MIME
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true); // الملف مقبول
    } else {
        cb('Error: يسمح برفع الصور فقط!'); // رسالة خطأ إذا كان الملف غير مقبول
    }
}

// تهيئة Multer مع الإعدادات التي أنشأناها
const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // تحديد أقصى حجم للملف (هنا 2 ميجابايت)
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
}).single('profileImage'); // 'profileImage' هو اسم حقل الإدخال (input) في النموذج

module.exports = upload;
