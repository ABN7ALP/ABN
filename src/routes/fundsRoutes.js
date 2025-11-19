const express = require('express');
const router = express.Router();
// =================== الإصلاح هنا ===================
// استيراد كل الدوال المصدرة من وحدة التحكم
const fundsController = require('../controllers/fundsController'); 
// =================================================

const { protect } = require('../middleware/authMiddleware');

// حماية جميع مسارات شحن الرصيد (يجب أن يكون المستخدم مسجلاً دخوله)
router.use(protect);

// =================== والإصلاح هنا أيضاً ===================
// استخدام الدوال من الكائن الذي تم استيراده
router.get('/', fundsController.getFundsPage);
router.post('/request', fundsController.createFundRequest);
// ========================================================

module.exports = router;
