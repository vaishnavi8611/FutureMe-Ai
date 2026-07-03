const express = require('express');
const weeklyLetterController = require('../controllers/weeklyLetterController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, weeklyLetterController.generateWeeklyLetter);
router.get('/', authMiddleware, weeklyLetterController.getWeeklyLetters);
router.get('/download/:id', authMiddleware, weeklyLetterController.downloadPDF);

module.exports = router;
