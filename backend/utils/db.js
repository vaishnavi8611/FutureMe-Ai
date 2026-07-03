const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let dbClient = null;
let isMock = false;

// Mock database file path
const MOCK_DB_FILE = path.join(__dirname, '..', '..', 'mock_db.json');

// Helper to load mock DB
function loadMockDB() {
    if (!fs.existsSync(MOCK_DB_FILE)) {
        const initialDB = {
            users: [],
            future_sessions: [],
            chat_messages: [],
            subscriptions: [],
            weekly_letters: [],
            user_memory: [],
            analytics_events: []
        };
        fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(initialDB, null, 2));
        return initialDB;
    }
    try {
        return JSON.parse(fs.readFileSync(MOCK_DB_FILE, 'utf8'));
    } catch (e) {
        console.error("Error loading mock database file, resetting:", e);
        return {
            users: [],
            future_sessions: [],
            chat_messages: [],
            subscriptions: [],
            weekly_letters: [],
            user_memory: [],
            analytics_events: []
        };
    }
}

// Helper to save mock DB
function saveMockDB(data) {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(data, null, 2));
}

if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_project_url') {
    console.log('🔌 Connecting to Supabase Database...');
    dbClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
} else {
    console.warn('⚠️ Supabase URL/Key missing. Initializing in-memory mock database mode.');
    isMock = true;
    loadMockDB();
}

// Unified Database Wrapper Interface
const db = {
    isMock: () => isMock,

    // Users API
    async createUser(id, name, email) {
        if (isMock) {
            const data = loadMockDB();
            const newUser = { id, name, email, is_admin: false, created_at: new Date().toISOString() };
            data.users.push(newUser);
            saveMockDB(data);
            return newUser;
        } else {
            const { data, error } = await dbClient
                .from('users')
                .insert([{ id, name, email }])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    async getUser(id) {
        if (isMock) {
            const data = loadMockDB();
            return data.users.find(u => u.id === id) || null;
        } else {
            const { data, error } = await dbClient
                .from('users')
                .select('*')
                .eq('id', id)
                .single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is code for 0 rows
            return data || null;
        }
    },

    // Sessions API
    async createSession(userId, name, age, goal, struggle, futureVision, tone, aiResponse) {
        if (isMock) {
            const data = loadMockDB();
            const newSession = {
                id: require('crypto').randomUUID(),
                user_id: userId,
                created_at: new Date().toISOString(),
                name,
                age,
                goal,
                struggle,
                future_vision: futureVision,
                tone,
                ai_response: aiResponse
            };
            data.future_sessions.push(newSession);
            saveMockDB(data);
            return newSession;
        } else {
            const { data, error } = await dbClient
                .from('future_sessions')
                .insert([{
                    user_id: userId,
                    name,
                    age,
                    goal,
                    struggle,
                    future_vision: futureVision,
                    tone,
                    ai_response: aiResponse
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    async getSessionsByUserId(userId) {
        if (isMock) {
            const data = loadMockDB();
            return data.future_sessions
                .filter(s => s.user_id === userId)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else {
            const { data, error } = await dbClient
                .from('future_sessions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    },

    async getSessionById(id) {
        if (isMock) {
            const data = loadMockDB();
            return data.future_sessions.find(s => s.id === id) || null;
        } else {
            const { data, error } = await dbClient
                .from('future_sessions')
                .select('*')
                .eq('id', id)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        }
    },

    // Chat Messages API
    async addChatMessage(sessionId, role, content) {
        if (isMock) {
            const data = loadMockDB();
            const newMessage = {
                id: require('crypto').randomUUID(),
                session_id: sessionId,
                role,
                content,
                timestamp: new Date().toISOString()
            };
            data.chat_messages.push(newMessage);
            saveMockDB(data);
            return newMessage;
        } else {
            const { data, error } = await dbClient
                .from('chat_messages')
                .insert([{ session_id: sessionId, role, content }])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    async getChatMessagesBySessionId(sessionId) {
        if (isMock) {
            const data = loadMockDB();
            return data.chat_messages
                .filter(m => m.session_id === sessionId)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } else {
            const { data, error } = await dbClient
                .from('chat_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('timestamp', { ascending: true });
            if (error) throw error;
            return data;
        }
    },

    async getChatCountByUserId(userId) {
        if (isMock) {
            const data = loadMockDB();
            // Get user's session IDs
            const sessionIds = data.future_sessions.filter(s => s.user_id === userId).map(s => s.id);
            return data.chat_messages.filter(m => sessionIds.includes(m.session_id) && m.role === 'user').length;
        } else {
            const { data, error } = await dbClient
                .from('future_sessions')
                .select('id');
            if (error) throw error;
            const sessionIds = data.map(s => s.id);
            
            const { count, error: countError } = await dbClient
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .in('session_id', sessionIds)
                .eq('role', 'user');
            if (countError) throw countError;
            return count;
        }
    },

    // Memory API
    async getMemory(userId) {
        if (isMock) {
            const data = loadMockDB();
            return data.user_memory.find(m => m.user_id === userId) || {
                user_id: userId,
                goals: [],
                fears: [],
                habits: [],
                recurring_challenges: []
            };
        } else {
            const { data, error } = await dbClient
                .from('user_memory')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        }
    },

    async saveMemory(userId, memoryData) {
        if (isMock) {
            const data = loadMockDB();
            let memory = data.user_memory.find(m => m.user_id === userId);
            if (!memory) {
                memory = { id: require('crypto').randomUUID(), user_id: userId };
                data.user_memory.push(memory);
            }
            memory.goals = memoryData.goals || [];
            memory.fears = memoryData.fears || [];
            memory.habits = memoryData.habits || [];
            memory.recurring_challenges = memoryData.recurring_challenges || [];
            memory.updated_at = new Date().toISOString();
            saveMockDB(data);
            return memory;
        } else {
            const { data, error } = await dbClient
                .from('user_memory')
                .upsert({
                    user_id: userId,
                    goals: memoryData.goals,
                    fears: memoryData.fears,
                    habits: memoryData.habits,
                    recurring_challenges: memoryData.recurring_challenges,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    // Subscriptions API
    async getSubscription(userId) {
        if (isMock) {
            const data = loadMockDB();
            return data.subscriptions.find(s => s.user_id === userId) || null;
        } else {
            const { data, error } = await dbClient
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        }
    },

    async saveSubscription(subscriptionId, userId, status, priceId, cancelAtPeriodEnd, currentPeriodEnd) {
        if (isMock) {
            const data = loadMockDB();
            let sub = data.subscriptions.find(s => s.id === subscriptionId || s.user_id === userId);
            if (!sub) {
                sub = { id: subscriptionId, user_id: userId };
                data.subscriptions.push(sub);
            }
            sub.status = status;
            sub.price_id = priceId;
            sub.cancel_at_period_end = cancelAtPeriodEnd;
            sub.current_period_end = currentPeriodEnd;
            sub.created_at = new Date().toISOString();
            saveMockDB(data);
            return sub;
        } else {
            const { data, error } = await dbClient
                .from('subscriptions')
                .upsert({
                    id: subscriptionId,
                    user_id: userId,
                    status,
                    price_id: priceId,
                    cancel_at_period_end: cancelAtPeriodEnd,
                    current_period_end: currentPeriodEnd
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    // Weekly Letters API
    async createWeeklyLetter(userId, subject, content) {
        if (isMock) {
            const data = loadMockDB();
            const newLetter = {
                id: require('crypto').randomUUID(),
                user_id: userId,
                subject,
                content,
                created_at: new Date().toISOString()
            };
            data.weekly_letters.push(newLetter);
            saveMockDB(data);
            return newLetter;
        } else {
            const { data, error } = await dbClient
                .from('weekly_letters')
                .insert([{ user_id: userId, subject, content }])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    async getWeeklyLetters(userId) {
        if (isMock) {
            const data = loadMockDB();
            return data.weekly_letters
                .filter(l => l.user_id === userId)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else {
            const { data, error } = await dbClient
                .from('weekly_letters')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    },

    async getWeeklyLetterById(id) {
        if (isMock) {
            const data = loadMockDB();
            return data.weekly_letters.find(l => l.id === id) || null;
        } else {
            const { data, error } = await dbClient
                .from('weekly_letters')
                .select('*')
                .eq('id', id)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        }
    },

    // Analytics Events API
    async logAnalyticsEvent(userId, eventName, properties = {}) {
        if (isMock) {
            const data = loadMockDB();
            const newEvent = {
                id: require('crypto').randomUUID(),
                user_id: userId,
                event_name: eventName,
                properties,
                created_at: new Date().toISOString()
            };
            data.analytics_events.push(newEvent);
            saveMockDB(data);
            return newEvent;
        } else {
            const { data, error } = await dbClient
                .from('analytics_events')
                .insert([{ user_id: userId, event_name: eventName, properties }]);
            if (error) console.error("Failed to log event to database:", error.message);
            return data;
        }
    },

    async getAdminMetrics() {
        if (isMock) {
            const data = loadMockDB();
            const activeSubs = data.subscriptions.filter(s => s.status === 'active').length;
            const goals = data.future_sessions.map(s => s.goal);
            return {
                totalUsers: data.users.length,
                totalGenerations: data.future_sessions.length,
                activeSubscribers: activeSubs,
                commonGoals: goals.slice(0, 10),
                recentEvents: data.analytics_events.slice(-20)
            };
        } else {
            const { count: totalUsers } = await dbClient.from('users').select('*', { count: 'exact', head: true });
            const { count: totalGenerations } = await dbClient.from('future_sessions').select('*', { count: 'exact', head: true });
            const { count: activeSubscribers } = await dbClient.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
            
            const { data: goalsData } = await dbClient.from('future_sessions').select('goal').limit(100);
            const commonGoals = goalsData ? goalsData.map(g => g.goal) : [];
            
            return {
                totalUsers: totalUsers || 0,
                totalGenerations: totalGenerations || 0,
                activeSubscribers: activeSubscribers || 0,
                commonGoals,
                recentEvents: []
            };
        }
    }
};

module.exports = db;
