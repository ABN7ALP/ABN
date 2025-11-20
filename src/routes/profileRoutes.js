const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// حماية جميع مسارات الملف الشخصي
router.use(protect);

router.get('/', profileController.getProfilePage);
router.post('/change-password', profileController.changePassword);
router.post('/upload-image', profileController.uploadImage); // <-- السطر الجديد

module.exports = router;
