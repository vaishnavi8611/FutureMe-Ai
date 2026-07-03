const express = require('express');
const billingController = require('../controllers/billingController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create-checkout', authMiddleware, billingController.createCheckout);
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.handleWebhook);

module.exports = router;
