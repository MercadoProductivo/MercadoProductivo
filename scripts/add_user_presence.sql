-- Migration: Add user presence table
-- This table tracks online/offline status for chat users

BEGIN;

-- Create user_presence table
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast online user lookups
CREATE INDEX IF NOT EXISTS idx_user_presence_online 
ON user_presence(is_online) 
WHERE is_online = TRUE;

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view presence (for chat UI)
CREATE POLICY "Users can view all presence" ON user_presence
  FOR SELECT USING (TRUE);

-- Policy: Users can only update their own presence
CREATE POLICY "Users can update own presence" ON user_presence
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can insert their own presence record
CREATE POLICY "Users can insert own presence" ON user_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update presence with automatic timestamp
CREATE OR REPLACE FUNCTION update_user_presence(p_user_id UUID, p_is_online BOOLEAN)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_presence (user_id, is_online, last_seen_at, updated_at)
  VALUES (p_user_id, p_is_online, NOW(), NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    is_online = p_is_online,
    last_seen_at = CASE WHEN p_is_online THEN NOW() ELSE user_presence.last_seen_at END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark users offline after inactivity (run via cron or trigger)
CREATE OR REPLACE FUNCTION mark_inactive_users_offline()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE user_presence
  SET is_online = FALSE, updated_at = NOW()
  WHERE is_online = TRUE
    AND updated_at < NOW() - INTERVAL '2 minutes';
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
