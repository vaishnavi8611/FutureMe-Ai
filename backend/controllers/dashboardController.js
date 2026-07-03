const db = require('../utils/db');

const dashboardController = {
    // GET /dashboard
    async getDashboardData(req, res) {
        const userId = req.user.id;

        try {
            // Retrieve all sessions for this user
            const sessions = await db.getSessionsByUserId(userId);
            const memory = await db.getMemory(userId);
            const subscription = await db.getSubscription(userId);

            // Compute growth timeline
            const growthTimeline = sessions.map(s => ({
                id: s.id,
                date: s.created_at,
                goal: s.goal,
                struggle: s.struggle,
                futureIdentity: s.ai_response.futureIdentity || 'Future Self',
                tone: s.tone
            }));

            // Compute goal evolution
            const goalEvolution = sessions.map(s => ({
                date: s.created_at,
                goal: s.goal
            })).reverse(); // Oldest first to show progress

            // Compute habit trends
            const habitTrends = sessions.map(s => ({
                date: s.created_at,
                habit: s.ai_response.habit
            })).reverse();

            // Reflection history (raw session detail)
            const reflectionHistory = sessions.map(s => ({
                id: s.id,
                created_at: s.created_at,
                goal: s.goal,
                struggle: s.struggle,
                tone: s.tone,
                messageSnippet: s.ai_response.message ? s.ai_response.message.substring(0, 100) + '...' : ''
            }));

            // Calculate chat statistics
            const chatCount = await db.getChatCountByUserId(userId);

            return res.status(200).json({
                growthTimeline,
                goalEvolution,
                habitTrends,
                reflectionHistory,
                stats: {
                    totalGenerations: sessions.length,
                    totalChats: chatCount,
                    tier: subscription && subscription.status === 'active' ? 'Premium' : 'Free'
                },
                memoryProfile: memory ? {
                    goals: memory.goals || [],
                    fears: memory.fears || [],
                    habits: memory.habits || [],
                    recurringChallenges: memory.recurring_challenges || []
                } : null
            });
        } catch (e) {
            console.error('Dashboard retrieval error:', e.message);
            return res.status(500).json({ error: 'Failed to fetch dashboard intelligence.' });
        }
    }
};

module.exports = dashboardController;
