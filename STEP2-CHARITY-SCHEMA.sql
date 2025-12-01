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
