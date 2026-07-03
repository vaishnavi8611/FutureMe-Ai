const PDFDocument = require('pdfkit');
const db = require('../utils/db');
const geminiService = require('../services/geminiService');
const emailService = require('../services/emailService');
const posthogService = require('../services/posthogService');

const weeklyLetterController = {
    // POST /weekly-letter
    async generateWeeklyLetter(req, res) {
        const userId = req.user.id;

        try {
            // Fetch user profile name, latest session, and memory
            const user = await db.getUser(userId);
            if (!user) {
                return res.status(404).json({ error: 'User profile not found.' });
            }

            const sessions = await db.getSessionsByUserId(userId);
            if (sessions.length === 0) {
                return res.status(400).json({ error: 'No FutureMe sessions created yet. Please generate a FutureMe first.' });
            }

            const latestSession = sessions[0];
            const memory = await db.getMemory(userId);
            const habits = memory ? memory.habits : [latestSession.ai_response.habit];

            // Fetch recent user message snippets to build context
            const recentChats = await db.getChatMessagesBySessionId(latestSession.id);
            const userChats = recentChats.filter(m => m.role === 'user').slice(-3).map(m => m.content);

            // Generate weekly letter from Gemini
            const letterData = await geminiService.generateWeeklyLetter(
                user.name,
                latestSession.goal,
                latestSession.struggle,
                habits,
                userChats
            );

            // Save in database
            const letter = await db.createWeeklyLetter(userId, letterData.subject, letterData.content);

            // Track event
            posthogService.trackEvent(userId, 'weekly_letter_generated', { letterId: letter.id });

            // Send Email via Resend
            emailService.sendWeeklyLetterEmail(user.email, user.name, letterData.subject, letterData.content).catch(err => {
                console.error('Failed to email weekly letter:', err.message);
            });

            return res.status(200).json({
                message: 'Weekly letter generated and emailed successfully.',
                letter
            });
        } catch (e) {
            console.error('Weekly letter generation error:', e.message);
            return res.status(500).json({ error: 'Failed to generate weekly letter. Please try again.' });
        }
    },

    // GET /weekly-letter
    async getWeeklyLetters(req, res) {
        const userId = req.user.id;
        try {
            const letters = await db.getWeeklyLetters(userId);
            return res.status(200).json({ letters });
        } catch (e) {
            console.error('Weekly letters fetch error:', e.message);
            return res.status(500).json({ error: 'Failed to fetch weekly letters.' });
        }
    },

    // GET /weekly-letter/download/:id
    async downloadPDF(req, res) {
        const userId = req.user.id;
        const letterId = req.params.id;

        try {
            const letter = await db.getWeeklyLetterById(letterId);
            if (!letter || letter.user_id !== userId) {
                return res.status(404).json({ error: 'Letter not found.' });
            }

            const user = await db.getUser(userId);
            const userName = user ? user.name : 'Explorer';

            // Create a PDF document using PDFKit
            const doc = new PDFDocument({ margin: 50 });

            // Set headers for file download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="FutureMe_Letter_${letterId.substring(0, 8)}.pdf"`);

            doc.pipe(res);

            // Styling - Apple/Reflective Theme
            doc.rect(0, 0, doc.page.width, doc.page.height).fill('#050505'); // dark background

            doc.fillColor('#8f8f8f')
               .fontSize(10)
               .text('FUTUREME REFLECTION LETTER', 50, 40, { characterSpacing: 1.5 });

            doc.fillColor('#222222')
               .moveTo(50, 55)
               .lineTo(560, 55)
               .stroke();

            // Date
            const dateStr = new Date(letter.created_at).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            doc.fillColor('#8f8f8f')
               .fontSize(10)
               .text(dateStr, 50, 80);

            // Subject Line
            doc.fillColor('#5b8cff')
               .fontSize(20)
               .font('Helvetica-Bold')
               .text(letter.subject, 50, 110, { width: 500 });

            // Line separation
            doc.fillColor('#222222')
               .moveTo(50, 150)
               .lineTo(560, 150)
               .stroke();

            // Content
            doc.fillColor('#ffffff')
               .fontSize(13)
               .font('Helvetica-Oblique')
               .text(letter.content, 50, 180, {
                   width: 500,
                   lineGap: 8,
                   paragraphGap: 15
               });

            // Footer
            doc.fillColor('#8f8f8f')
               .fontSize(9)
               .font('Helvetica')
               .text('Reflect honestly • Build intentionally • Move with clarity', 50, doc.page.height - 60, {
                   align: 'center',
                   width: 500
               });

            doc.end();
            
            posthogService.trackEvent(userId, 'weekly_letter_pdf_downloaded', { letterId });
        } catch (e) {
            console.error('PDF download error:', e.message);
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Failed to generate PDF.' });
            }
        }
    }
};

module.exports = weeklyLetterController;
