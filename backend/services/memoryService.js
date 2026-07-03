const db = require('../utils/db');
const geminiService = require('./geminiService');

const memoryService = {
    // Retrieve long-term memory for a user
    async getUserMemory(userId) {
        try {
            return await db.getMemory(userId);
        } catch (e) {
            console.error(`Error getting memory for user ${userId}:`, e.message);
            return null;
        }
    },

    // Trigger update of user memory based on a new FutureMe generation
    async updateMemory(userId, session, aiResponse) {
        try {
            // Get existing memory profile
            const currentMemory = await this.getUserMemory(userId);

            // Extract updated insights using Gemini Service
            const updatedMemory = await geminiService.extractMemory(
                session.name,
                session.goal,
                session.struggle,
                session.future_vision,
                aiResponse,
                currentMemory
            );

            // Save back to DB
            await db.saveMemory(userId, updatedMemory);
            console.log(`🧠 Memory profile updated for user ${userId}.`);
            return updatedMemory;
        } catch (e) {
            console.error(`Error updating memory for user ${userId}:`, e.message);
            return null;
        }
    }
};

module.exports = memoryService;
