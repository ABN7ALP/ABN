// services/uploadService.js
const { cloudinary } = require('../config/cloudinary'); 

class UploadService {
    // رفع صورة إلى Cloudinary - النسخة المحسنة
    static async uploadImage(base64Image, folder = 'smm-store') {
        try {
            console.log(`📤 جاري رفع الصورة إلى Cloudinary - Folder: ${folder}`);
            
            // تحديد التحويلات حسب نوع الصورة
            let transformations = [];
            
            if (folder.includes('profiles')) {
                // تحويلات صور البروفايل
                transformations = [
                    { width: 200, height: 200, crop: 'fill' },
                    { quality: 'auto' },
                    { format: 'webp' }
                ];
            } else if (folder.includes('deposits')) {
                // تحويلات صور الإيصالات
                transformations = [
                    { width: 800, height: 600, crop: 'limit' }, // حجم مناسب للإيصالات
                    { quality: 'auto:good' }, // جودة عالية للإيصالات
                    { format: 'webp' }
                ];
            } else {
                // تحويلات افتراضية
                transformations = [
                    { width: 600, height: 400, crop: 'limit' },
                    { quality: 'auto' },
                    { format: 'webp' }
                ];
            }

            const result = await cloudinary.uploader.upload(base64Image, {
                folder: folder,
                resource_type: 'image',
                transformation: transformations
            });

            console.log('✅ تم رفع الصورة بنجاح:', result.secure_url);
            return {
                success: true,
                url: result.secure_url,
                publicId: result.public_id
            };
        } catch (error) {
            console.error('❌ Cloudinary upload error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // حذف صورة من Cloudinary - نفس الكود
    static async deleteImage(publicId) {
        try {
            await cloudinary.uploader.destroy(publicId);
            console.log('🗑️ تم حذف الصورة من Cloudinary:', publicId);
            return { success: true };
        } catch (error) {
            console.error('❌ Cloudinary delete error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = UploadService;
