-- Fix: chat_conversation_members.user_id FK should reference auth.users, not profiles
-- This allows conversations with users who may not have a profiles record yet.

-- Step 1: Drop the existing FK constraint
ALTER TABLE public.chat_conversation_members
DROP CONSTRAINT IF EXISTS chat_conversation_members_user_id_fkey;

-- Step 2: Re-add the FK to reference auth.users instead of profiles
-- Note: auth.users is the source of truth for user IDs; profiles may be created later.
ALTER TABLE public.chat_conversation_members
ADD CONSTRAINT chat_conversation_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Confirmation
SELECT 'FK updated successfully: chat_conversation_members.user_id -> auth.users(id)' as result;
