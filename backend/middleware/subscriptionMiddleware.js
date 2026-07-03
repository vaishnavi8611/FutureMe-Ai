const db = require('../utils/db');

async function subscriptionMiddleware(req, res, next) {
    const userId = req.user.id;

    try {
        // Fetch user subscription details
        const subscription = await db.getSubscription(userId);
        const isPremium = subscription && subscription.status === 'active';

        // Attach premium status to the request object for controllers to use
        req.isPremium = isPremium;

        // Skip limits check for premium users
        if (isPremium) {
            return next();
        }

        // Apply Free tier checks depending on the route
        const path = req.path;

        if (path === '/generate') {
            const sessions = await db.getSessionsByUserId(userId);
            if (sessions.length >= 3) {
                return res.status(403).json({
                    error: 'Limit Reached: You have reached the maximum of 3 generations allowed on the Free Tier. Please upgrade to Premium for unlimited generations.',
                    limitExceeded: true
                });
            }
        }

        if (path === '/chat') {
            const chatCount = await db.getChatCountByUserId(userId);
            if (chatCount >= 20) {
                return res.status(403).json({
                    error: 'Limit Reached: You have reached the maximum of 20 chat messages allowed on the Free Tier. Please upgrade to Premium for unlimited conversation.',
                    limitExceeded: true
                });
            }
        }

        next();
    } catch (e) {
        console.error('Subscription checking error:', e.message);
        // Fallback to letting the request through rather than crashing
        next();
    }
}

module.exports = subscriptionMiddleware;
