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
