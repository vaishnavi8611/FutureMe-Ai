const express = require('express');
const futuremeController = require('../controllers/futuremeController');
const authMiddleware = require('../middleware/authMiddleware');
const safetyMiddleware = require('../middleware/safetyMiddleware');
const subscriptionMiddleware = require('../middleware/subscriptionMiddleware');

const router = express.Router();

router.post('/generate', authMiddleware, safetyMiddleware, subscriptionMiddleware, futuremeController.generate);
router.post('/chat', authMiddleware, safetyMiddleware, subscriptionMiddleware, futuremeController.chat);
router.get('/history', authMiddleware, futuremeController.getHistory);

module.exports = router;
