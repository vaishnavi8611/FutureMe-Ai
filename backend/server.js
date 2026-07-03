require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./utils/db');

// Import routers
const authRouter = require('./routes/auth');
const futuremeRouter = require('./routes/futureme');
const dashboardRouter = require('./routes/dashboard');
const billingRouter = require('./routes/billing');
const weeklyLetterRouter = require('./routes/weeklyLetter');

// Import middlewares
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Raw body parser middleware for Stripe webhooks signature verification
app.use((req, res, next) => {
    if (req.originalUrl === '/billing/webhook') {
        next();
    } else {
        express.json()(req, res, next);
    }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/auth', authRouter);
app.use('/futureme', futuremeRouter);
app.use('/dashboard', dashboardRouter);
app.use('/billing', billingRouter);
app.use('/weekly-letter', weeklyLetterRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        databaseMode: db.isMock() ? 'mock' : 'production'
    });
});

// Admin metrics endpoint (for Admin Panel view)
app.get('/admin/metrics', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        // Verify user exists and is admin
        const profile = await db.getUser(userId);
        if (!profile || !profile.is_admin) {
            // Note: In development mode with mock DB, we allow reading metrics for demo purposes
            if (!db.isMock()) {
                return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
            }
        }

        const metrics = await db.getAdminMetrics();
        return res.status(200).json(metrics);
    } catch (e) {
        console.error('Admin metrics error:', e.message);
        return res.status(500).json({ error: 'Failed to retrieve admin insights.' });
    }
});

// Fallback all other routes to index.html for Single Page Application client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 FutureMe Backend Server running on port ${PORT}`);
        console.log(`🌍 Frontend available at: http://localhost:${PORT}`);
    });
}

module.exports = app;
