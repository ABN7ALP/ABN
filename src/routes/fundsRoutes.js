const express = require('express');
const router = express.Router();
const { getAddFundsPage } = require('../controllers/fundsController');
const { protect } = require('../middleware/authMiddleware');

// حماية المسار
router.use(protect);

// مسار عرض صفحة شحن الرصيد
router.get('/', getAddFundsPage);

module.exports = router;
