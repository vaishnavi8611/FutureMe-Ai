const db = require('../utils/db');
const geminiService = require('../services/geminiService');
const memoryService = require('../services/memoryService');
const posthogService = require('../services/posthogService');

const futuremeController = {
    // POST /futureme/generate
    async generate(req, res) {
        const userId = req.user.id;
        const { name, age, goal, struggle, future, tone } = req.body;

        if (!name || !age || !goal || !struggle || !future || !tone) {
            return res.status(400).json({ error: 'Please fill out all fields before generating.' });
        }

        try {
            // Retrieve long-term memory to feed into the Gemini prompt
            const userMemory = await memoryService.getUserMemory(userId);
            let memoryContext = '';
            if (userMemory) {
                memoryContext = `
Previous Goals: ${JSON.stringify(userMemory.goals || [])}
Previous Challenges: ${JSON.stringify(userMemory.fears || [])}
Recommended Habits in action: ${JSON.stringify(userMemory.habits || [])}
`;
            }

            // Generate FutureMe response via Gemini
            const aiResponse = await geminiService.generateFutureMe(
                name, age, goal, struggle, future, tone, memoryContext
            );

            // Save session to database
            const session = await db.createSession(
                userId, name, parseInt(age), goal, struggle, future, tone, aiResponse
            );

            // Log analytics
            posthogService.trackEvent(userId, 'futureme_generated', {
                sessionId: session.id,
                tone,
                age: parseInt(age)
            });

            // Update user memory asynchronously in the background
            memoryService.updateMemory(userId, session, aiResponse).catch(err => {
                console.error('Failed to update memory profile:', err.message);
            });

            return res.status(200).json({
                message: 'FutureMe generated successfully.',
                session
            });
        } catch (e) {
            console.error('Generation error:', e.message);
            return res.status(500).json({ error: 'Failed to generate FutureMe. Please try again.' });
        }
    },

    // POST /futureme/chat
    async chat(req, res) {
        const userId = req.user.id;
        const { sessionId, message } = req.body;

        if (!sessionId || !message) {
            return res.status(400).json({ error: 'Please provide sessionId and message.' });
        }

        try {
            // Fetch the session and verify ownership
            const session = await db.getSessionById(sessionId);
            if (!session || session.user_id !== userId) {
                return res.status(404).json({ error: 'FutureMe session not found.' });
            }

            // Retrieve existing chat history for context
            const history = await db.getChatMessagesBySessionId(sessionId);

            // Add user message to DB
            await db.addChatMessage(sessionId, 'user', message);

            // Call Gemini service for chat reply
            const aiReply = await geminiService.chatWithFutureMe(session, history, message);

            // Add AI response to DB
            const aiMsg = await db.addChatMessage(sessionId, 'assistant', aiReply);

            // Log analytics
            posthogService.trackEvent(userId, 'chat_message_sent', { sessionId });

            return res.status(200).json({
                message: 'Message sent.',
                userMessage: message,
                aiResponse: aiMsg
            });
        } catch (e) {
            console.error('Chat error:', e.message);
            return res.status(500).json({ error: 'Failed to process chat. Please try again.' });
        }
    },

    // GET /futureme/history
    async getHistory(req, res) {
        const userId = req.user.id;
        try {
            const sessions = await db.getSessionsByUserId(userId);
            return res.status(200).json({ sessions });
        } catch (e) {
            console.error('History retrieval error:', e.message);
            return res.status(500).json({ error: 'Failed to fetch reflection history.' });
        }
    }
};

module.exports = futuremeController;
