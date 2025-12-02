-- ====================================
-- SKATEQUEST DATABASE SETUP
-- Complete automated database migration
-- Run this once in Supabase SQL Editor
-- ====================================

-- ====================================
-- STEP 1: Update profiles table
-- ====================================

-- Add gamification columns to existing profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS unlocked_tricks TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS completed_challenges TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS battle_pass_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS battle_pass_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS charity_points INTEGER DEFAULT 0;

-- ====================================
-- STEP 2: Create Skate Lounge tables
-- ====================================

-- Chat messages table
CREATE TABLE IF NOT EXISTS lounge_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room TEXT NOT NULL,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lounge_messages_room ON lounge_messages(room, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lounge_messages_user ON lounge_messages(user_id);

-- Enable Row Level Security
ALTER TABLE lounge_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lounge_messages
DROP POLICY IF EXISTS "Anyone can read messages" ON lounge_messages;
CREATE POLICY "Anyone can read messages" ON lounge_messages
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert messages" ON lounge_messages;
CREATE POLICY "Users can insert messages" ON lounge_messages
    FOR INSERT WITH CHECK (true);

-- ====================================
-- Skate sessions table
CREATE TABLE IF NOT EXISTS skate_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    spot_id TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER DEFAULT 20,
    participants TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'upcoming',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_skate_sessions_time ON skate_sessions(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_skate_sessions_creator ON skate_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_skate_sessions_status ON skate_sessions(status);

-- Enable RLS
ALTER TABLE skate_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skate_sessions
DROP POLICY IF EXISTS "Anyone can read sessions" ON skate_sessions;
CREATE POLICY "Anyone can read sessions" ON skate_sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create sessions" ON skate_sessions;
CREATE POLICY "Users can create sessions" ON skate_sessions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update sessions" ON skate_sessions;
CREATE POLICY "Users can update sessions" ON skate_sessions
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Creators can delete sessions" ON skate_sessions;
CREATE POLICY "Creators can delete sessions" ON skate_sessions
    FOR DELETE USING (true);

-- ====================================
-- Live streams table
CREATE TABLE IF NOT EXISTS live_streams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    streamer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    spot_id TEXT,
    status TEXT DEFAULT 'live',
    viewer_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_streamer ON live_streams(streamer_id);

-- Enable RLS
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_streams
DROP POLICY IF EXISTS "Anyone can read streams" ON live_streams;
CREATE POLICY "Anyone can read streams" ON live_streams
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create streams" ON live_streams;
CREATE POLICY "Users can create streams" ON live_streams
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Streamers can update streams" ON live_streams;
CREATE POLICY "Streamers can update streams" ON live_streams
    FOR UPDATE USING (true);

-- ====================================
-- Crew projects table
CREATE TABLE IF NOT EXISTS crew_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    crew_id TEXT,
    creator_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'planning',
    members TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crew_projects_crew ON crew_projects(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_projects_creator ON crew_projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_crew_projects_status ON crew_projects(status);

-- Enable RLS
ALTER TABLE crew_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crew_projects
DROP POLICY IF EXISTS "Anyone can read projects" ON crew_projects;
CREATE POLICY "Anyone can read projects" ON crew_projects
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create projects" ON crew_projects;
CREATE POLICY "Users can create projects" ON crew_projects
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Members can update projects" ON crew_projects;
CREATE POLICY "Members can update projects" ON crew_projects
    FOR UPDATE USING (true);

-- ====================================
-- STEP 3: Enable Realtime
-- ====================================

-- Note: You still need to enable realtime in Supabase Dashboard
-- Go to: Database → Replication → Enable for these tables:
-- ✅ lounge_messages
-- ✅ skate_sessions
-- ✅ live_streams
-- ✅ crew_projects

-- ====================================
-- STEP 4: Insert sample data (optional)
-- ====================================

-- Insert a welcome message in global chat
INSERT INTO lounge_messages (room, user_id, message, type)
VALUES ('global', 'system', 'Welcome to SkateQuest! 🛹', 'text')
ON CONFLICT DO NOTHING;

-- ====================================
-- SETUP COMPLETE!
-- ====================================

-- Verify tables were created
SELECT
    'lounge_messages' as table_name,
    COUNT(*) as row_count
FROM lounge_messages
UNION ALL
SELECT
    'skate_sessions',
    COUNT(*)
FROM skate_sessions
UNION ALL
SELECT
    'live_streams',
    COUNT(*)
FROM live_streams
UNION ALL
SELECT
    'crew_projects',
    COUNT(*)
FROM crew_projects;

-- Show success message
SELECT
    '✅ Database setup complete!' as status,
    'All tables created successfully' as message,
    'Remember to enable Realtime for all tables in Supabase Dashboard' as next_step;
