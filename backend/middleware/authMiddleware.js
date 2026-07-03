const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-futureme-development-12345';

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authorization token provided.' });
    }

    const token = authHeader.split(' ')[1];

    // Check for development mock tokens
    if (token.startsWith('mock-user-id-')) {
        const userId = token.replace('mock-user-id-', '');
        req.user = { id: userId, email: `${userId}@mock.com` };
        return next();
    }

    try {
        if (db.isMock()) {
            // For mock DB environment, verify using our local JWT_SECRET
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = { id: decoded.id, email: decoded.email };
            next();
        } else {
            // Under Supabase production environment, the token is verified using Supabase Auth
            // We can retrieve user session details from Supabase using the token
            // Note: Since Supabase client is already configured, we can use it to verify the JWT
            const supabase = require('@supabase/supabase-js').createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_KEY
            );
            const { data: { user }, error } = await supabase.auth.getUser(token);
            
            if (error || !user) {
                return res.status(401).json({ error: 'Invalid or expired session token.' });
            }
            
            req.user = { id: user.id, email: user.email };
            next();
        }
    } catch (e) {
        console.error('Auth middleware validation error:', e.message);
        return res.status(401).json({ error: 'Unauthorized. Invalid signature.' });
    }
}

module.exports = authMiddleware;
