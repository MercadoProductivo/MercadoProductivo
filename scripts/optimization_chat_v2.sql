-- Function: chat_get_conversations_v2
-- Description: Retrieves enriched conversation list for a user in a single query.
-- Replaces client-side enrichment logic in /api/chat/conversations

CREATE OR REPLACE FUNCTION chat_get_conversations_v2(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    last_created_at timestamptz,
    preview text,
    unread_count int,
    counterparty_id uuid,
    counterparty_name text, -- Pre-calculated name from profile priority
    counterparty_avatar_url text,
    counterparty_email text -- Optional, usually strict privacy but legacy code fetched it
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.last_message_at as last_created_at,
        NULL::text as preview, -- Column last_message_preview does not exist, setting to NULL to fix error
        m_self.unread_count,
        -- Counterparty Info
        other_p.id as counterparty_id,
        COALESCE(
            NULLIF(other_p.company, ''), 
            NULLIF(TRIM(other_p.first_name || ' ' || other_p.last_name), ''), 
            other_p.full_name, 
            'Usuario'
        ) as counterparty_name,
        other_p.avatar_url as counterparty_avatar_url,
        NULL::text as counterparty_email -- We avoid exposing email in SQL for privacy unless strictly needed. The API can fetch if needed, or we omit.
    FROM chat_conversations c
    JOIN chat_conversation_members m_self ON c.id = m_self.conversation_id
    LEFT JOIN chat_conversation_members m_other ON c.id = m_other.conversation_id AND m_other.user_id != p_user_id
    LEFT JOIN profiles other_p ON m_other.user_id = other_p.id
    WHERE m_self.user_id = p_user_id
    ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION chat_get_conversations_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION chat_get_conversations_v2(uuid) TO service_role;
