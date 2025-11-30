// services/uploadService.js
const cloudinary = require('../config/cloudinary');

class UploadService {
    // رفع صورة إلى Cloudinary
    static async uploadImage(base64Image, folder = 'smm-store/profiles') {
        try {
            // تحويل Base64 إلى Buffer
            const result = await cloudinary.uploader.upload(base64Image, {
                folder: folder,
                resource_type: 'image',
                transformation: [
                    { width: 200, height: 200, crop: 'fill' },
                    { quality: 'auto' },
                    { format: 'webp' } // أفضل ضغط
                ]
            });

            return {
                success: true,
                url: result.secure_url,
                publicId: result.public_id
            };
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // حذف صورة من Cloudinary
    static async deleteImage(publicId) {
        try {
            await cloudinary.uploader.destroy(publicId);
            return { success: true };
        } catch (error) {
            console.error('Cloudinary delete error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = UploadService;
