-- =====================================================
-- RLS Performance Optimization Migration
-- =====================================================
-- Fixes auth.uid() re-evaluation issues in RLS policies
--
-- Problem: auth.uid() is re-evaluated for each row, causing
-- performance degradation at scale.
--
-- Solution: Wrap auth.uid() with (select auth.uid()) to ensure
-- it's evaluated once per query instead of once per row.
--
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- =====================================================

-- Profiles table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = id);

-- Users table
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
ON public.users FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = id);

-- Skate spots table
DROP POLICY IF EXISTS "Authenticated users can create spots" ON public.skate_spots;
CREATE POLICY "Authenticated users can create spots"
ON public.skate_spots FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = added_by);

DROP POLICY IF EXISTS "Users can update own spots" ON public.skate_spots;
CREATE POLICY "Users can update own spots"
ON public.skate_spots FOR UPDATE
TO authenticated
USING ((select auth.uid()) = added_by);

DROP POLICY IF EXISTS "Users can delete own spots" ON public.skate_spots;
CREATE POLICY "Users can delete own spots"
ON public.skate_spots FOR DELETE
TO authenticated
USING ((select auth.uid()) = added_by);

-- Challenges table
DROP POLICY IF EXISTS "Authenticated users can create challenges" ON public.challenges;
CREATE POLICY "Authenticated users can create challenges"
ON public.challenges FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Authenticated users can complete challenges" ON public.challenges;
CREATE POLICY "Authenticated users can complete challenges"
ON public.challenges FOR UPDATE
TO authenticated
USING (true);

-- Challenge completions table
DROP POLICY IF EXISTS "Users can view own completions" ON public.challenge_completions;
CREATE POLICY "Users can view own completions"
ON public.challenge_completions FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own completions" ON public.challenge_completions;
CREATE POLICY "Users can create own completions"
ON public.challenge_completions FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own completions" ON public.challenge_completions;
CREATE POLICY "Users can update own completions"
ON public.challenge_completions FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Shops table
DROP POLICY IF EXISTS "Authenticated users can add shops" ON public.shops;
CREATE POLICY "Authenticated users can add shops"
ON public.shops FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = added_by);

-- Park visits table
DROP POLICY IF EXISTS "Users can view own visits" ON public.park_visits;
CREATE POLICY "Users can view own visits"
ON public.park_visits FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create visits" ON public.park_visits;
CREATE POLICY "Users can create visits"
ON public.park_visits FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- Park ratings table
DROP POLICY IF EXISTS "Users can create ratings" ON public.park_ratings;
CREATE POLICY "Users can create ratings"
ON public.park_ratings FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own ratings" ON public.park_ratings;
CREATE POLICY "Users can update own ratings"
ON public.park_ratings FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Videos table
DROP POLICY IF EXISTS "Users can upload videos" ON public.videos;
CREATE POLICY "Users can upload videos"
ON public.videos FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own videos" ON public.videos;
CREATE POLICY "Users can update own videos"
ON public.videos FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own videos" ON public.videos;
CREATE POLICY "Users can delete own videos"
ON public.videos FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Comments table
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
CREATE POLICY "Users can create comments"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments"
ON public.comments FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments"
ON public.comments FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Crews table
DROP POLICY IF EXISTS "Authenticated users can create crews" ON public.crews;
CREATE POLICY "Authenticated users can create crews"
ON public.crews FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = founder_id OR (select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Creator can update crew" ON public.crews;
CREATE POLICY "Creator can update crew"
ON public.crews FOR UPDATE
TO authenticated
USING ((select auth.uid()) = founder_id OR (select auth.uid()) = created_by);

-- Crew members table
DROP POLICY IF EXISTS "Authenticated users can join crews" ON public.crew_members;
CREATE POLICY "Authenticated users can join crews"
ON public.crew_members FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can leave crews" ON public.crew_members;
CREATE POLICY "Users can leave crews"
ON public.crew_members FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Events table
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Authenticated users can create events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = organizer_id OR (select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Creator can update events" ON public.events;
CREATE POLICY "Creator can update events"
ON public.events FOR UPDATE
TO authenticated
USING ((select auth.uid()) = organizer_id OR (select auth.uid()) = created_by);

-- Event RSVPs table
DROP POLICY IF EXISTS "Authenticated users can RSVP" ON public.event_rsvps;
CREATE POLICY "Authenticated users can RSVP"
ON public.event_rsvps FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can cancel RSVP" ON public.event_rsvps;
CREATE POLICY "Users can cancel RSVP"
ON public.event_rsvps FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Media table
DROP POLICY IF EXISTS "Users can upload media" ON public.media;
CREATE POLICY "Users can upload media"
ON public.media FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id OR (select auth.uid()) = uploaded_by);

DROP POLICY IF EXISTS "Users can delete own media" ON public.media;
CREATE POLICY "Users can delete own media"
ON public.media FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id OR (select auth.uid()) = uploaded_by);

-- Spot conditions table
DROP POLICY IF EXISTS "Users can report conditions" ON public.spot_conditions;
CREATE POLICY "Users can report conditions"
ON public.spot_conditions FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = reported_by OR (select auth.uid()) = user_id);

-- Spot photos table
DROP POLICY IF EXISTS "Users can add spot photos" ON public.spot_photos;
CREATE POLICY "Users can add spot photos"
ON public.spot_photos FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = added_by OR (select auth.uid()) = user_id);

-- Activities table
DROP POLICY IF EXISTS "Users can create activities" ON public.activities;
CREATE POLICY "Users can create activities"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- User tricks table
DROP POLICY IF EXISTS "Users can view own tricks" ON public.user_tricks;
CREATE POLICY "Users can view own tricks"
ON public.user_tricks FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can add tricks" ON public.user_tricks;
CREATE POLICY "Users can add tricks"
ON public.user_tricks FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own tricks" ON public.user_tricks;
CREATE POLICY "Users can update own tricks"
ON public.user_tricks FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own tricks" ON public.user_tricks;
CREATE POLICY "Users can delete own tricks"
ON public.user_tricks FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Skate games table
DROP POLICY IF EXISTS "Users can view their games" ON public.skate_games;
CREATE POLICY "Users can view their games"
ON public.skate_games FOR SELECT
TO authenticated
USING ((select auth.uid()) = player1_id OR (select auth.uid()) = player2_id OR (select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can create games" ON public.skate_games;
CREATE POLICY "Users can create games"
ON public.skate_games FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = player1_id OR (select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Players can update their games" ON public.skate_games;
CREATE POLICY "Players can update their games"
ON public.skate_games FOR UPDATE
TO authenticated
USING ((select auth.uid()) = player1_id OR (select auth.uid()) = player2_id OR (select auth.uid()) = created_by);

-- Skate game turns table
DROP POLICY IF EXISTS "Players can add turns" ON public.skate_game_turns;
CREATE POLICY "Players can add turns"
ON public.skate_game_turns FOR INSERT
TO authenticated
WITH CHECK (
    (select auth.uid()) IN (
        SELECT player1_id FROM public.skate_games WHERE id = game_id
        UNION
        SELECT player2_id FROM public.skate_games WHERE id = game_id
    )
);

-- Playlists table
DROP POLICY IF EXISTS "Anyone can view public playlists" ON public.playlists;
CREATE POLICY "Anyone can view public playlists"
ON public.playlists FOR SELECT
TO public
USING (is_public = true OR (select auth.uid()) = user_id OR (select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can create playlists" ON public.playlists;
CREATE POLICY "Users can create playlists"
ON public.playlists FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id OR (select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can update own playlists" ON public.playlists;
CREATE POLICY "Users can update own playlists"
ON public.playlists FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id OR (select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can delete own playlists" ON public.playlists;
CREATE POLICY "Users can delete own playlists"
ON public.playlists FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id OR (select auth.uid()) = created_by);

-- Media likes table
DROP POLICY IF EXISTS "Users can like media" ON public.media_likes;
CREATE POLICY "Users can like media"
ON public.media_likes FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can unlike media" ON public.media_likes;
CREATE POLICY "Users can unlike media"
ON public.media_likes FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Playlist likes table
DROP POLICY IF EXISTS "Users can like playlists" ON public.playlist_likes;
CREATE POLICY "Users can like playlists"
ON public.playlist_likes FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can unlike playlists" ON public.playlist_likes;
CREATE POLICY "Users can unlike playlists"
ON public.playlist_likes FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Verification query - run this to check that policies are optimized
-- SELECT
--     schemaname,
--     tablename,
--     policyname,
--     CASE
--         WHEN qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(select auth.uid())%' THEN 'NEEDS FIX'
--         WHEN with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(select auth.uid())%' THEN 'NEEDS FIX'
--         ELSE 'OK'
--     END as status
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND (qual::text LIKE '%auth.uid()%' OR with_check::text LIKE '%auth.uid()%')
-- ORDER BY tablename, policyname;
