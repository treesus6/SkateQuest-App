-- ================================================================
-- SKATEQUEST COMPLETE DATABASE SETUP
-- Run this ENTIRE file in Supabase SQL Editor
-- ================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- PROFILES
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    spots_added INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    crew_id UUID,
    crew_tag TEXT,
    trick_progress JSONB DEFAULT '{}',
    active_session JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Continue reading from the original files...
-- ============================================
-- STEP 1: MAIN DATABASE SCHEMA
-- Copy this ENTIRE file and paste in Supabase SQL Editor
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- 1. USER PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    spots_added INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    crew_id UUID,
    crew_tag TEXT,
    trick_progress JSONB DEFAULT '{}',
    active_session JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT TO public USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. SKATE SPOTS TABLE
-- =====================================================
CREATE TABLE public.skate_spots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    type TEXT,
    tricks TEXT[],
    photo_url TEXT,
    video_url TEXT,
    description TEXT,
    added_by UUID REFERENCES public.profiles(id),
    rating NUMERIC(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.skate_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Spots are viewable by everyone"
ON public.skate_spots FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert spots"
ON public.skate_spots FOR INSERT TO authenticated WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Users can update their own spots"
ON public.skate_spots FOR UPDATE TO authenticated USING (auth.uid() = added_by);

CREATE INDEX idx_skate_spots_location ON public.skate_spots USING GIST(location);
CREATE INDEX idx_skate_spots_added_by ON public.skate_spots(added_by);

-- =====================================================
-- 3. CHALLENGES TABLE
-- =====================================================
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spot_id UUID REFERENCES public.skate_spots(id) ON DELETE CASCADE,
    trick TEXT NOT NULL,
    description TEXT,
    xp_reward INTEGER DEFAULT 100,
    created_by UUID REFERENCES public.profiles(id),
    completed_by UUID[] DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges are viewable by everyone"
ON public.challenges FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can create challenges"
ON public.challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Challenge creators can update their challenges"
ON public.challenges FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE INDEX idx_challenges_spot_id ON public.challenges(spot_id);
CREATE INDEX idx_challenges_created_by ON public.challenges(created_by);

-- =====================================================
-- 4. TRICK CALLOUTS TABLE
-- =====================================================
CREATE TABLE public.trick_callouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenger_id UUID REFERENCES public.profiles(id) NOT NULL,
    challenger_username TEXT NOT NULL,
    target_id UUID REFERENCES public.profiles(id) NOT NULL,
    target_username TEXT NOT NULL,
    trick TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'declined')),
    proof_video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.trick_callouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view callouts they're involved in"
ON public.trick_callouts FOR SELECT TO authenticated
USING (auth.uid() = challenger_id OR auth.uid() = target_id);

CREATE POLICY "Users can create callouts"
ON public.trick_callouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Target users can update callout status"
ON public.trick_callouts FOR UPDATE TO authenticated USING (auth.uid() = target_id);

CREATE INDEX idx_callouts_challenger ON public.trick_callouts(challenger_id);
CREATE INDEX idx_callouts_target ON public.trick_callouts(target_id);

-- =====================================================
-- 5. CREWS TABLE
-- =====================================================
CREATE TABLE public.crews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tag TEXT UNIQUE NOT NULL CHECK (length(tag) >= 2 AND length(tag) <= 5),
    bio TEXT,
    founder_id UUID REFERENCES public.profiles(id) NOT NULL,
    founder_name TEXT NOT NULL,
    members UUID[] DEFAULT '{}',
    member_names TEXT[] DEFAULT '{}',
    total_xp INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    spots_added INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crews are viewable by everyone"
ON public.crews FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can create crews"
ON public.crews FOR INSERT TO authenticated WITH CHECK (auth.uid() = founder_id);

CREATE POLICY "Crew members can update crew"
ON public.crews FOR UPDATE TO authenticated USING (auth.uid() = ANY(members));

CREATE POLICY "Crew founders can delete crew"
ON public.crews FOR DELETE TO authenticated USING (auth.uid() = founder_id);

CREATE INDEX idx_crews_tag ON public.crews(tag);
CREATE INDEX idx_crews_founder ON public.crews(founder_id);

-- =====================================================
-- 6. SESSIONS TABLE
-- =====================================================
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL,
    spots_visited UUID[] DEFAULT '{}',
    tricks_attempted INTEGER DEFAULT 0,
    tricks_landed INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
ON public.sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
ON public.sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_end_time ON public.sessions(end_time DESC);

-- =====================================================
-- 7. EVENTS TABLE
-- =====================================================
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('jam', 'contest', 'meetup', 'lesson', 'demo')),
    organizer_id UUID REFERENCES public.profiles(id) NOT NULL,
    organizer_name TEXT NOT NULL,
    attendees UUID[] DEFAULT '{}',
    attendee_names TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
ON public.events FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can create events"
ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers and attendees can update events"
ON public.events FOR UPDATE TO authenticated
USING (auth.uid() = organizer_id OR auth.uid() = ANY(attendees));

CREATE INDEX idx_events_datetime ON public.events(datetime);
CREATE INDEX idx_events_organizer ON public.events(organizer_id);

-- =====================================================
-- 8. SHOPS TABLE
-- =====================================================
CREATE TABLE public.shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    phone TEXT,
    website TEXT,
    instagram TEXT,
    hours TEXT,
    verified BOOLEAN DEFAULT false,
    added_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shops are viewable by everyone"
ON public.shops FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can add shops"
ON public.shops FOR INSERT TO authenticated WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Shop submitters can update their shops"
ON public.shops FOR UPDATE TO authenticated USING (auth.uid() = added_by);

CREATE INDEX idx_shops_location ON public.shops USING GIST(location);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_location_geography()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_skate_spot_location
BEFORE INSERT OR UPDATE ON public.skate_spots
FOR EACH ROW EXECUTE FUNCTION update_location_geography();

CREATE TRIGGER set_shop_location
BEFORE INSERT OR UPDATE ON public.shops
FOR EACH ROW EXECUTE FUNCTION update_location_geography();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('spot-photos', 'spot-photos', true) ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('spot-videos', 'spot-videos', true) ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('challenge-proofs', 'challenge-proofs', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public can view spot photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'spot-photos');

CREATE POLICY "Authenticated users can upload spot photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'spot-photos');

CREATE POLICY "Public can view spot videos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'spot-videos');

CREATE POLICY "Authenticated users can upload spot videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'spot-videos');

CREATE POLICY "Users can view challenge proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'challenge-proofs');

CREATE POLICY "Authenticated users can upload challenge proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'challenge-proofs');

-- =====================================================
-- VIEWS
-- =====================================================

CREATE OR REPLACE VIEW crew_leaderboard AS
SELECT
    id, name, tag, total_xp,
    array_length(members, 1) as member_count,
    spots_added, challenges_completed,
    ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank
FROM public.crews
ORDER BY total_xp DESC;

CREATE OR REPLACE VIEW user_stats AS
SELECT
    p.id, p.username, p.xp, p.level, p.spots_added, p.crew_tag,
    COUNT(DISTINCT s.id) as total_sessions,
    COALESCE(SUM(s.duration), 0) as total_skate_time_seconds,
    ROW_NUMBER() OVER (ORDER BY p.xp DESC) as leaderboard_rank
FROM public.profiles p
LEFT JOIN public.sessions s ON p.id = s.user_id
GROUP BY p.id, p.username, p.xp, p.level, p.spots_added, p.crew_tag
ORDER BY p.xp DESC;

-- QR Code Charity System for SkateQuest
-- Help kids get skateboards through community scavenger hunts!

-- =====================================================
-- 1. QR CODES TABLE
-- =====================================================
CREATE TABLE public.qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- The actual QR code value (unique hash)
    purchased_by UUID REFERENCES public.profiles(id) NOT NULL,
    purchaser_name TEXT NOT NULL,
    purchase_price DECIMAL(10,2) DEFAULT 2.00, -- Price paid for this code
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'found', 'expired', 'hidden')),

    -- Hiding information
    hidden_at TIMESTAMP WITH TIME ZONE,
    hidden_location_lat DOUBLE PRECISION,
    hidden_location_lng DOUBLE PRECISION,
    hidden_location_description TEXT,
    hidden_location GEOGRAPHY(POINT, 4326),

    -- Finding information
    found_by UUID REFERENCES public.profiles(id),
    found_by_name TEXT,
    found_at TIMESTAMP WITH TIME ZONE,

    -- Rewards & Challenges
    xp_reward INTEGER DEFAULT 100,
    bonus_reward TEXT, -- Special reward text
    trick_challenge TEXT, -- Custom trick to land (e.g., "Kickflip", "50-50 grind")
    challenge_message TEXT, -- Custom message from the hider
    proof_required BOOLEAN DEFAULT false, -- Whether video proof is needed

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days')
);

-- Enable RLS
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view QR codes they purchased or found"
ON public.qr_codes FOR SELECT
TO authenticated
USING (auth.uid() = purchased_by OR auth.uid() = found_by OR status = 'hidden');

CREATE POLICY "Users can insert QR codes they purchase"
ON public.qr_codes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = purchased_by);

CREATE POLICY "Purchasers can update their QR codes"
ON public.qr_codes FOR UPDATE
TO authenticated
USING (auth.uid() = purchased_by OR auth.uid() = found_by);

CREATE INDEX idx_qr_codes_purchaser ON public.qr_codes(purchased_by);
CREATE INDEX idx_qr_codes_finder ON public.qr_codes(found_by);
CREATE INDEX idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX idx_qr_codes_location ON public.qr_codes USING GIST(hidden_location);

-- =====================================================
-- 2. DONATIONS TABLE
-- =====================================================
CREATE TABLE public.donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID REFERENCES public.profiles(id) NOT NULL,
    donor_name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT CHECK (type IN ('qr_purchase', 'direct_donation', 'sponsorship')),
    payment_method TEXT, -- 'stripe', 'paypal', etc.
    payment_id TEXT, -- External payment ID
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

    -- What it's funding
    allocated_to TEXT, -- 'skateboard', 'equipment', 'park_access', etc.

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own donations"
ON public.donations FOR SELECT
TO authenticated
USING (auth.uid() = donor_id);

CREATE POLICY "Users can insert their own donations"
ON public.donations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = donor_id);

-- Admins can view all (add admin role later)
CREATE POLICY "Public can view donation totals"
ON public.donations FOR SELECT
TO public
USING (true); -- Will be restricted to aggregate queries only

CREATE INDEX idx_donations_donor ON public.donations(donor_id);
CREATE INDEX idx_donations_created ON public.donations(created_at DESC);

-- =====================================================
-- 3. SKATEBOARD RECIPIENTS TABLE
-- =====================================================
CREATE TABLE public.skateboard_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_name TEXT NOT NULL, -- Can be first name only or "Anonymous" for privacy
    age INTEGER,
    location_city TEXT,
    location_state TEXT,
    story TEXT, -- Brief story (optional, for transparency)

    -- What they received
    skateboard_type TEXT, -- 'complete', 'deck', 'full-setup'
    cost DECIMAL(10,2) NOT NULL,
    funded_by UUID[] DEFAULT '{}', -- Array of donation IDs

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'delivered', 'cancelled')),
    delivered_at TIMESTAMP WITH TIME ZONE,

    -- Privacy
    public_display BOOLEAN DEFAULT false, -- Whether to show on public dashboard

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.skateboard_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view approved public recipients"
ON public.skateboard_recipients FOR SELECT
TO public
USING (status = 'delivered' AND public_display = true);

-- Only authenticated users can see pending
CREATE POLICY "Authenticated users can view all recipients"
ON public.skateboard_recipients FOR SELECT
TO authenticated
USING (true);

CREATE INDEX idx_recipients_status ON public.skateboard_recipients(status);
CREATE INDEX idx_recipients_created ON public.skateboard_recipients(created_at DESC);

-- =====================================================
-- 4. CHARITY STATS TABLE (Aggregated Stats)
-- =====================================================
CREATE TABLE public.charity_stats (
    id INTEGER PRIMARY KEY DEFAULT 1, -- Single row
    total_raised DECIMAL(12,2) DEFAULT 0,
    total_qr_codes_sold INTEGER DEFAULT 0,
    total_qr_codes_found INTEGER DEFAULT 0,
    total_skateboards_donated INTEGER DEFAULT 0,
    total_kids_helped INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize the stats row
INSERT INTO public.charity_stats (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.charity_stats ENABLE ROW LEVEL SECURITY;

-- Everyone can read stats
CREATE POLICY "Anyone can view charity stats"
ON public.charity_stats FOR SELECT
TO public
USING (true);

-- =====================================================
-- 5. QR CODE HUNTS (Optional - Organized Hunts)
-- =====================================================
CREATE TABLE public.qr_hunts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    organizer_id UUID REFERENCES public.profiles(id) NOT NULL,

    -- Hunt details
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_codes INTEGER DEFAULT 0,
    codes_found INTEGER DEFAULT 0,

    -- Goal
    fundraising_goal DECIMAL(10,2),
    skateboards_goal INTEGER,

    -- Location
    area_name TEXT, -- "Downtown LA", "Venice Beach", etc.
    area_lat DOUBLE PRECISION,
    area_lng DOUBLE PRECISION,
    area_radius INTEGER, -- Radius in meters

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.qr_hunts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active hunts"
ON public.qr_hunts FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create hunts"
ON public.qr_hunts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = organizer_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update charity stats when donation added
CREATE OR REPLACE FUNCTION update_charity_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE public.charity_stats
        SET
            total_raised = total_raised + NEW.amount,
            total_qr_codes_sold = CASE
                WHEN NEW.type = 'qr_purchase' THEN total_qr_codes_sold + 1
                ELSE total_qr_codes_sold
            END,
            last_updated = NOW()
        WHERE id = 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for donations
CREATE TRIGGER update_stats_on_donation
AFTER INSERT ON public.donations
FOR EACH ROW
EXECUTE FUNCTION update_charity_stats();

-- Function to update stats when QR code found
CREATE OR REPLACE FUNCTION update_qr_found_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'found' AND OLD.status != 'found' THEN
        UPDATE public.charity_stats
        SET
            total_qr_codes_found = total_qr_codes_found + 1,
            last_updated = NOW()
        WHERE id = 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for QR codes
CREATE TRIGGER update_stats_on_qr_found
AFTER UPDATE ON public.qr_codes
FOR EACH ROW
EXECUTE FUNCTION update_qr_found_stats();

-- Function to update stats when skateboard delivered
CREATE OR REPLACE FUNCTION update_skateboard_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        UPDATE public.charity_stats
        SET
            total_skateboards_donated = total_skateboards_donated + 1,
            total_kids_helped = total_kids_helped + 1,
            last_updated = NOW()
        WHERE id = 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for recipients
CREATE TRIGGER update_stats_on_delivery
AFTER UPDATE ON public.skateboard_recipients
FOR EACH ROW
EXECUTE FUNCTION update_skateboard_stats();

-- Function to generate unique QR code
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate random code (you can customize this)
        code := 'SK8-' || upper(substring(md5(random()::text) from 1 for 8));

        -- Check if exists
        SELECT EXISTS(SELECT 1 FROM public.qr_codes WHERE qr_codes.code = code) INTO exists;

        EXIT WHEN NOT exists;
    END LOOP;

    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to purchase QR code
CREATE OR REPLACE FUNCTION purchase_qr_code(
    user_id UUID,
    username TEXT,
    amount DECIMAL,
    payment_method TEXT,
    payment_id TEXT,
    quantity INTEGER DEFAULT 1
)
RETURNS SETOF UUID AS $$
DECLARE
    new_code_id UUID;
    i INTEGER;
BEGIN
    -- Create donation record
    INSERT INTO public.donations (donor_id, donor_name, amount, type, payment_method, payment_id, status)
    VALUES (user_id, username, amount, 'qr_purchase', payment_method, payment_id, 'completed');

    -- Create QR codes
    FOR i IN 1..quantity LOOP
        INSERT INTO public.qr_codes (code, purchased_by, purchaser_name, purchase_price)
        VALUES (generate_qr_code(), user_id, username, amount / quantity)
        RETURNING id INTO new_code_id;

        RETURN NEXT new_code_id;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS
-- =====================================================

-- View for public leaderboard (most QR codes found)
CREATE OR REPLACE VIEW qr_finder_leaderboard AS
SELECT
    p.id,
    p.username,
    COUNT(qr.id) as qr_codes_found,
    SUM(qr.xp_reward) as total_xp_earned,
    ROW_NUMBER() OVER (ORDER BY COUNT(qr.id) DESC) as rank
FROM public.profiles p
LEFT JOIN public.qr_codes qr ON p.id = qr.found_by
WHERE qr.found_by IS NOT NULL
GROUP BY p.id, p.username
ORDER BY qr_codes_found DESC
LIMIT 100;

-- View for top contributors
CREATE OR REPLACE VIEW top_donors AS
SELECT
    p.id,
    p.username,
    COUNT(d.id) as donation_count,
    SUM(d.amount) as total_donated,
    ROW_NUMBER() OVER (ORDER BY SUM(d.amount) DESC) as rank
FROM public.profiles p
JOIN public.donations d ON p.id = d.donor_id
WHERE d.status = 'completed'
GROUP BY p.id, p.username
ORDER BY total_donated DESC
LIMIT 100;

-- View for impact dashboard
CREATE OR REPLACE VIEW charity_impact AS
SELECT
    cs.total_raised,
    cs.total_qr_codes_sold,
    cs.total_qr_codes_found,
    cs.total_skateboards_donated,
    cs.total_kids_helped,
    COUNT(DISTINCT d.donor_id) as unique_donors,
    cs.total_qr_codes_sold - cs.total_qr_codes_found as qr_codes_still_hidden,
    CASE
        WHEN cs.total_raised > 0 THEN (cs.total_skateboards_donated * 100.0 / (cs.total_raised / 100))
        ELSE 0
    END as cost_per_skateboard
FROM public.charity_stats cs
CROSS JOIN public.donations d
WHERE cs.id = 1 AND d.status = 'completed'
GROUP BY cs.id, cs.total_raised, cs.total_qr_codes_sold, cs.total_qr_codes_found,
         cs.total_skateboards_donated, cs.total_kids_helped;

-- Grant permissions to views
GRANT SELECT ON qr_finder_leaderboard TO PUBLIC;
GRANT SELECT ON top_donors TO PUBLIC;
GRANT SELECT ON charity_impact TO PUBLIC;

-- SkateQuest Videos Table Schema
-- For storing trick videos uploaded by users

CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- User & Spot info
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    spot_id UUID REFERENCES public.skate_spots(id) ON DELETE SET NULL,

    -- Video details
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER, -- in seconds
    file_size INTEGER, -- in bytes

    -- Trick info
    trick_name TEXT,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),

    -- Engagement
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'reported', 'deleted')),
    is_featured BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Published videos are viewable by everyone"
ON public.videos FOR SELECT
TO public
USING (status = 'published');

CREATE POLICY "Users can insert their own videos"
ON public.videos FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
ON public.videos FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
ON public.videos FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_spot_id ON public.videos(spot_id);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX idx_videos_likes ON public.videos(likes_count DESC);
CREATE INDEX idx_videos_status ON public.videos(status);

-- Video Likes Table
CREATE TABLE IF NOT EXISTS public.video_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(video_id, user_id)
);

-- Enable RLS for likes
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
ON public.video_likes FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can like videos"
ON public.video_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike videos"
ON public.video_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Video Comments Table
CREATE TABLE IF NOT EXISTS public.video_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for comments
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
ON public.video_comments FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can comment"
ON public.video_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.video_comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.video_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_video_likes_video_id ON public.video_likes(video_id);
CREATE INDEX idx_video_likes_user_id ON public.video_likes(user_id);
CREATE INDEX idx_video_comments_video_id ON public.video_comments(video_id);
CREATE INDEX idx_video_comments_user_id ON public.video_comments(user_id);

-- Function to update video likes count
CREATE OR REPLACE FUNCTION update_video_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.videos
        SET likes_count = likes_count + 1
        WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.videos
        SET likes_count = likes_count - 1
        WHERE id = OLD.video_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for likes
DROP TRIGGER IF EXISTS update_likes_count_trigger ON public.video_likes;
CREATE TRIGGER update_likes_count_trigger
AFTER INSERT OR DELETE ON public.video_likes
FOR EACH ROW
EXECUTE FUNCTION update_video_likes_count();

-- Function to update comments count
CREATE OR REPLACE FUNCTION update_video_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.videos
        SET comments_count = comments_count + 1
        WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.videos
        SET comments_count = comments_count - 1
        WHERE id = OLD.video_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comments
DROP TRIGGER IF EXISTS update_comments_count_trigger ON public.video_comments;
CREATE TRIGGER update_comments_count_trigger
AFTER INSERT OR DELETE ON public.video_comments
FOR EACH ROW
EXECUTE FUNCTION update_video_comments_count();

-- Function to increment video views
CREATE OR REPLACE FUNCTION increment_video_views(video_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.videos
    SET views_count = views_count + 1
    WHERE id = video_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for video feed (with user info)
CREATE OR REPLACE VIEW video_feed AS
SELECT
    v.id,
    v.video_url,
    v.thumbnail_url,
    v.trick_name,
    v.description,
    v.tags,
    v.difficulty,
    v.views_count,
    v.likes_count,
    v.shares_count,
    v.comments_count,
    v.created_at,
    p.username,
    p.level as user_level,
    s.name as spot_name,
    s.latitude as spot_lat,
    s.longitude as spot_lng
FROM public.videos v
LEFT JOIN public.profiles p ON v.user_id = p.id
LEFT JOIN public.skate_spots s ON v.spot_id = s.id
WHERE v.status = 'published'
ORDER BY v.created_at DESC;

-- Grant access to view
GRANT SELECT ON video_feed TO PUBLIC;
