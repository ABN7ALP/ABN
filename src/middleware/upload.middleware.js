const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. إعداد Cloudinary باستخدام متغيرات البيئة الآمنة
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. إعداد مساحة التخزين على Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'smm-store-uploads', // اسم المجلد الذي سيتم إنشاءه في حسابك على Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'], // تحديد أنواع الصور المسموح بها فقط (حماية)
        transformation: [{ width: 1024, height: 1024, crop: 'limit' }] // ضغط وتصغير الصور تلقائياً للحفاظ على المساحة
    }
});

// 3. فلتر إضافي للتحقق من نوع الملف على الخادم قبل الرفع (طبقة حماية إضافية)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // قبول الملف
    } else {
        // رفض الملف إذا لم يكن صورة، مع رسالة خطأ واضحة
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'الملف المرفوع ليس صورة!'), false);
    }
};

// 4. إعداد multer مع التخزين السحابي والحماية
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5 // الحجم الأقصى 5 ميغابايت (حماية من الملفات الكبيرة جداً)
    }
});

module.exports = upload;
