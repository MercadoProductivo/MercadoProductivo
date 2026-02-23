import { useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/store/chat-store";
import { toast } from "sonner";
import type { ChatItem } from "@/components/chat/chat-messages";
import { markConversationRead } from "@/lib/chat/delivery";

export function useChatFetcher({
    conversationId,
    selfId,
    onConversationRead,
}: {
    conversationId: string | null;
    selfId: string;
    onConversationRead?: (id: string) => void;
}) {
    const {
        setTimeline,
        setLoading,
        setLoadingOlder,
        setHasMoreOlder,
        hasMoreOlder,
        loadingOlder,
        timeline,
        addMessage,
        prependMessages,
        setActiveConversation,
        reset
    } = useChatStore();

    const supabase = createClient();

    // Reset al cambiar de conversación
    useEffect(() => {
        setActiveConversation(conversationId);
    }, [conversationId, setActiveConversation]);

    const loadMessages = useCallback(async () => {
        if (!conversationId) return;
        setLoading(true);
        try {
            const url = new URL(`/api/chat/conversations/${conversationId}/messages`, window.location.origin);
            url.searchParams.set("limit", "50");
            url.searchParams.set("order", "desc");

            const res = await fetch(url.toString(), { cache: "no-store", headers: { 'Content-Type': 'application/json' } });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Error al cargar historial");

            const rows = Array.isArray(data?.messages) ? data.messages : [];
            const tl: ChatItem[] = rows
                .slice()
                .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((m: any) => ({
                    id: `msg-${m.id}`,
                    type: String(m.sender_id) === String(selfId) ? "outgoing" : "incoming",
                    message_id: conversationId || undefined,
                    body: m.body,
                    created_at: m.created_at,
                    sender_name: m.sender_name,
                    sender_email: m.sender_email,
                    avatar_url: m.avatar_url,
                }));

            setTimeline(tl);

            // Marcar como leído
            try {
                await markConversationRead(conversationId);
                onConversationRead?.(conversationId);
            } catch { }

        } catch (e: any) {
            toast.error(e?.message || "No se pudo cargar el historial");
        } finally {
            setLoading(false);
        }
    }, [conversationId, selfId, onConversationRead, setLoading, setTimeline]);

    // Cargar inicial
    useEffect(() => {
        if (conversationId) {
            loadMessages();
        }
    }, [conversationId, loadMessages]);

    const loadOlder = useCallback(async () => {
        if (loadingOlder || !conversationId || timeline.length === 0 || !hasMoreOlder) return;
        setLoadingOlder(true);
        try {
            const earliest = timeline[0]?.created_at;
            if (!earliest) return;

            const before = new Date(new Date(earliest).getTime() - 1000).toISOString();
            const url = new URL(`/api/chat/conversations/${conversationId}/messages`, window.location.origin);
            url.searchParams.set("limit", "50");
            url.searchParams.set("before", before);
            url.searchParams.set("order", "desc");

            const res = await fetch(url.toString(), { cache: "no-store", headers: { 'Content-Type': 'application/json' } });
            const j = await res.json();
            if (!res.ok) throw new Error(j?.message || "Error al cargar anteriores");

            const rows = Array.isArray(j?.messages) ? j.messages : [];
            if (rows.length === 0) {
                setHasMoreOlder(false);
                return;
            }

            const items: ChatItem[] = rows.map((m: any) => ({
                id: `msg-${m.id}`,
                type: String(m.sender_id) === String(selfId) ? "outgoing" : "incoming",
                message_id: conversationId,
                body: m.body,
                created_at: m.created_at,
                sender_name: m.sender_name,
                sender_email: m.sender_email,
                avatar_url: m.avatar_url,
            }));

            prependMessages(items);

        } catch (e: any) {
            toast.error(e?.message || "No se pudo cargar más mensajes");
        } finally {
            setLoadingOlder(false);
        }
    }, [loadingOlder, conversationId, timeline, hasMoreOlder, selfId, setLoadingOlder, setHasMoreOlder, prependMessages]);

    return { loadOlder };
}
