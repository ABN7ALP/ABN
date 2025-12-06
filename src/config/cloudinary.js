// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
require('dotenv').config();

// ===================================================================
// 1. إعداد Cloudinary (الكود الخاص بك موجود هنا)
// ===================================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ===================================================================
// 2. إعداد Multer لتخزين الملفات في الذاكرة (الإضافة الجديدة)
// ===================================================================
const storage = multer.memoryStorage();
const multerUpload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('الملف ليس صورة!'), false);
        }
    }
});

// ===================================================================
// 3. دالة الرفع إلى Cloudinary (الإضافة الجديدة)
// ===================================================================
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// ===================================================================
// 4. تصدير كل الأدوات اللازمة (التعديل الأهم)
// ===================================================================
module.exports = {
  uploadToCloudinary,
  multerUpload,
  cloudinary // نستمر في تصدير هذا أيضاً
};

