const express = require('express');
const router = express.Router();
const fundsController = require('../controllers/fundsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', fundsController.getFundsPage);
router.post('/request', fundsController.createFundRequest);

module.exports = router;
