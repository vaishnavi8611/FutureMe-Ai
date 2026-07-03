const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const emailService = require('../services/emailService');
const posthogService = require('../services/posthogService');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-futureme-development-12345';

// Configure a temporary Supabase admin client for backend signup routing in production mode
let supabaseAdmin = null;
if (!db.isMock()) {
    const { createClient } = require('@supabase/supabase-js');
    supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

const authController = {
    // POST /auth/signup
    async signup(req, res) {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Please provide name, email, and password.' });
        }

        try {
            let userId = null;
            let token = null;

            if (db.isMock()) {
                // Generate a mock uuid
                userId = require('crypto').randomUUID();
                
                // Add to mock users database
                await db.createUser(userId, name, email);
                
                // Sign a local JWT
                token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
            } else {
                // Production: Register in Supabase auth
                const { data, error } = await supabaseAdmin.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name
                        }
                    }
                });

                if (error) throw error;
                if (!data.user) throw new Error('SignUp failed, no user returned.');

                userId = data.user.id;
                token = data.session?.access_token || '';

                // Insert into public.users profiles table
                await db.createUser(userId, name, email);
            }

            // Log analytics
            posthogService.identifyUser(userId, { name, email });
            posthogService.trackEvent(userId, 'user_signup', { email });

            // Send Welcome Email (async background task)
            emailService.sendWelcomeEmail(email, name).catch(err => {
                console.error('Failed to send welcome email:', err.message);
            });

            return res.status(201).json({
                message: 'User registered successfully.',
                token,
                user: { id: userId, name, email }
            });
        } catch (e) {
            console.error('Signup error:', e.message);
            return res.status(500).json({ error: e.message || 'Internal Server Error during signup.' });
        }
    },

    // POST /auth/login
    async login(req, res) {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password.' });
        }

        try {
            let userId = null;
            let token = null;
            let name = '';

            if (db.isMock()) {
                // Local dev verification
                const data = JSON.parse(require('fs').readFileSync(
                    require('path').join(__dirname, '..', '..', 'mock_db.json'), 'utf8'
                ));
                const user = data.users.find(u => u.email === email);
                
                if (!user) {
                    return res.status(401).json({ error: 'Invalid email or password.' });
                }

                userId = user.id;
                name = user.name;
                token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
            } else {
                // Production Supabase Auth Sign In
                const { data, error } = await supabaseAdmin.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) return res.status(401).json({ error: error.message });
                if (!data.user) throw new Error('Sign in failed.');

                userId = data.user.id;
                token = data.session.access_token;
                
                // Get name from profiles table
                const profile = await db.getUser(userId);
                name = profile ? profile.name : (data.user.user_metadata?.full_name || 'User');
            }

            posthogService.trackEvent(userId, 'user_login');

            return res.status(200).json({
                message: 'Login successful.',
                token,
                user: { id: userId, name, email }
            });
        } catch (e) {
            console.error('Login error:', e.message);
            return res.status(500).json({ error: e.message || 'Internal Server Error during login.' });
        }
    }
};

module.exports = authController;
