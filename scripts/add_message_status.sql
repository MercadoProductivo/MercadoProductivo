-- Migration: Add message delivery and read status columns
-- Enables tracking when messages are delivered and read

BEGIN;

-- Add delivery and read timestamp columns to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Index for efficient unread message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread 
ON chat_messages(conversation_id, sender_id, created_at) 
WHERE read_at IS NULL;

-- Index for delivery status queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_undelivered
ON chat_messages(conversation_id, sender_id, created_at)
WHERE delivered_at IS NULL;

-- Function to mark messages as delivered for a conversation
CREATE OR REPLACE FUNCTION mark_messages_delivered(
  p_conversation_id UUID,
  p_reader_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE chat_messages
  SET delivered_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_reader_id  -- Only mark messages FROM others as delivered
    AND delivered_at IS NULL;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read for a conversation
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_conversation_id UUID,
  p_reader_id UUID
)
RETURNS TABLE(message_id UUID, sender_id UUID) AS $$
BEGIN
  RETURN QUERY
  UPDATE chat_messages
  SET 
    read_at = NOW(),
    delivered_at = COALESCE(delivered_at, NOW())  -- Also mark as delivered if not already
  WHERE conversation_id = p_conversation_id
    AND chat_messages.sender_id != p_reader_id
    AND read_at IS NULL
  RETURNING chat_messages.id AS message_id, chat_messages.sender_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
