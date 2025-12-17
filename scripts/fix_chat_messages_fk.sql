-- Fix Foreign Key on chat_messages table
-- The error "insert or update on table "chat_messages" violates foreign key constraint "chat_messages_sender_id_fkey""
-- indicates that sender_id is likely referencing public.profiles (or public.users) but the user might only exist in auth.users
-- or the profile hasn't been created yet.
-- This script repoints the FK to auth.users which is the source of truth.

BEGIN;

-- 1. Drop the existing constraint if it exists
ALTER TABLE IF EXISTS public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;

-- 2. Add the correct constraint referencing auth.users
ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_sender_id_fkey
FOREIGN KEY (sender_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

COMMIT;
