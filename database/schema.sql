-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY, -- matches Supabase auth.users.id
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- FUTURE SESSIONS (User's FutureMe Generations)
CREATE TABLE IF NOT EXISTS future_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    goal TEXT NOT NULL,
    struggle TEXT NOT NULL,
    future_vision TEXT NOT NULL,
    tone TEXT NOT NULL,
    ai_response JSONB NOT NULL -- Contains: message, futureIdentity, nextMoves[], habit
);

-- CHAT MESSAGES (Conversations with FutureMe)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES future_sessions(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SUBSCRIPTIONS (Stripe sync)
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY, -- Stripe Subscription ID
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL, -- e.g., active, trialing, past_due, canceled
    price_id TEXT,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- WEEKLY FUTURE LETTERS
CREATE TABLE IF NOT EXISTS weekly_letters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- USER PROFILE MEMORY (Long-term AI Memory cache)
CREATE TABLE IF NOT EXISTS user_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    goals JSONB DEFAULT '[]'::jsonb,
    fears JSONB DEFAULT '[]'::jsonb,
    habits JSONB DEFAULT '[]'::jsonb,
    recurring_challenges JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ANALYTICS EVENTS (Backend track)
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Setup (Optional but highly recommended for Supabase production)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policies (Example: users can read/write their own data)
CREATE POLICY "Users can view and edit their own profile" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage their own future sessions" ON future_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view chat messages for their own sessions" ON chat_messages FOR ALL
    USING (EXISTS (SELECT 1 FROM future_sessions WHERE future_sessions.id = chat_messages.session_id AND future_sessions.user_id = auth.uid()));
CREATE POLICY "Users can view their own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own weekly letters" ON weekly_letters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view and edit their own memory" ON user_memory FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own analytics events" ON analytics_events FOR ALL USING (auth.uid() = user_id);
