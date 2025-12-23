"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribePrivate, getPusherClient, onConnectionStateChange, safeUnsubscribe } from "@/lib/pusher/client";
import { markConversationRead } from "@/lib/chat/delivery";
import { MessageNewEventSchema } from "@/lib/chat/events";
import { toast } from "sonner";
import type { ChatItem } from "@/components/chat/chat-messages";

export type UseConversationOptions = {
    conversationId: string | null;
    selfId: string;
    counterpartyId?: string;
    counterpartyName?: string | null;
    counterpartyAvatarUrl?: string | null;
    onConversationRead?: (conversationId: string) => void;
};

export type UseConversationReturn = {
    timeline: ChatItem[];
    loading: boolean;
    connState: string;
    isTyping: boolean;
    lastReadAt: string | null;
    selfName: string | null;
    selfEmail: string | null;
    selfAvatarUrl: string | null;
    addOptimisticMessage: (msg: Omit<ChatItem, "id"> & { tempId?: string }) => string;
    confirmMessage: (tempId: string, serverId: string) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    markAsRead: () => Promise<void>;
    loadOlder: () => Promise<void>;
    hasMoreOlder: boolean;
    loadingOlder: boolean;
};

/**
 * Hook unificado para manejo de conversaciones de chat.
 * Extrae lógica común de buyer-conversation-window y seller-conversation-panel.
 */
export function useConversation({
    conversationId,
    selfId,
    counterpartyId,
    counterpartyName,
    counterpartyAvatarUrl,
    onConversationRead,
}: UseConversationOptions): UseConversationReturn {
    const [timeline, setTimeline] = useState<ChatItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMoreOlder, setHasMoreOlder] = useState(true);
    const [connState, setConnState] = useState<string>("disconnected");
    const [isTyping, setIsTyping] = useState(false);
    const [lastReadAt, setLastReadAt] = useState<string | null>(null);
    const [selfName, setSelfName] = useState<string | null>(null);
    const [selfEmail, setSelfEmail] = useState<string | null>(null);
    const [selfAvatarUrl, setSelfAvatarUrl] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const seenRef = useRef<Set<string>>(new Set());
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const markingReadRef = useRef<boolean>(false);
    const lastReadPostAtRef = useRef<number>(0);

    const supabase = useMemo(() => createClient(), []);

    // Cargar perfil propio
    useEffect(() => {
        if (!selfId) return;
        (async () => {
            try {
                const [{ data: auth }, { data }] = await Promise.all([
                    supabase.auth.getUser(),
                    supabase
                        .from("profiles")
                        .select("full_name,avatar_url")
                        .eq("id", selfId)
                        .maybeSingle(),
                ]);
                setSelfName((data?.full_name || "").toString().trim() || null);
                setSelfEmail((auth?.user?.email || "").toString().trim() || null);
                setSelfAvatarUrl((data?.avatar_url || "").toString().trim() || null);
            } catch { }
        })();
    }, [supabase, selfId]);

    // Estado de conexión Pusher
    useEffect(() => {
        const off = onConnectionStateChange((state) => {
            try { setConnState(state as any); } catch { }
        });
        return () => { try { off?.(); } catch { } };
    }, []);

    // Cargar historial de mensajes
    const loadMessages = useCallback(async () => {
        if (!conversationId) return;
        setLoading(true);
        try {
            const url = new URL(`/api/chat/conversations/${conversationId}/messages`, window.location.origin);
            url.searchParams.set("limit", "50");
            url.searchParams.set("order", "desc");

            const res = await fetch(url.toString(), { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || data?.error || "Error al cargar historial");

            const rows = Array.isArray(data?.messages) ? data.messages : [];
            const tl: ChatItem[] = rows
                .slice()
                .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((m: any) => ({
                    id: `msg-${m.id}`,
                    type: String(m.sender_id) === String(selfId) ? "outgoing" : "incoming",
                    message_id: conversationId,
                    body: m.body,
                    created_at: m.created_at,
                    sender_name: m.sender_name,
                    sender_email: m.sender_email,
                    avatar_url: m.avatar_url,
                }));

            setTimeline(tl);
            tl.forEach((it) => seenRef.current.add(it.id));

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
    }, [conversationId, selfId, onConversationRead]);

    // Cargar al cambiar conversationId
    useEffect(() => {
        if (conversationId) {
            seenRef.current.clear();
            loadMessages();
        }
    }, [conversationId, loadMessages]);

    // Cargar mensajes anteriores
    const loadOlder = useCallback(async () => {
        if (loadingOlder || !conversationId || timeline.length === 0 || !hasMoreOlder) return;
        setLoadingOlder(true);
        try {
            const earliest = timeline[0].created_at;
            const before = new Date(new Date(earliest).getTime() - 1000).toISOString();
            const url = new URL(`/api/chat/conversations/${conversationId}/messages`, window.location.origin);
            url.searchParams.set("limit", "50");
            url.searchParams.set("before", before);
            url.searchParams.set("order", "desc");

            const res = await fetch(url.toString(), { cache: "no-store" });
            const j = await res.json();
            if (!res.ok) throw new Error(j?.message || j?.error || "Error al cargar anteriores");

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

            setTimeline((prev) => {
                const map = new Map(prev.map((it) => [it.id, it]));
                for (const it of items) {
                    if (!map.has(it.id)) map.set(it.id, it);
                }
                const next = Array.from(map.values());
                next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                return next;
            });
        } catch (e: any) {
            toast.error(e?.message || "No se pudo cargar más mensajes");
        } finally {
            setLoadingOlder(false);
        }
    }, [loadingOlder, conversationId, timeline, hasMoreOlder, selfId]);

    // Marcar como leído
    const markAsRead = useCallback(async () => {
        if (!conversationId || markingReadRef.current) return;
        const now = Date.now();
        if (now - lastReadPostAtRef.current < 2000) return;

        try {
            markingReadRef.current = true;
            await markConversationRead(conversationId);
            onConversationRead?.(conversationId);
            lastReadPostAtRef.current = Date.now();
        } catch (error) {
            console.error("Error al marcar como leída:", error);
        } finally {
            markingReadRef.current = false;
        }
    }, [conversationId, onConversationRead]);

    // Mensaje optimista
    const addOptimisticMessage = useCallback(
        (msg: Omit<ChatItem, "id"> & { tempId?: string }): string => {
            const tempId = msg.tempId || `msg-temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const key = tempId;
            if (seenRef.current.has(key)) return key;
            seenRef.current.add(key);

            setTimeline((prev) => {
                const next = prev.concat({
                    ...msg,
                    id: key,
                    sender_name: msg.sender_name || selfName || undefined,
                    sender_email: msg.sender_email || selfEmail || undefined,
                    avatar_url: msg.avatar_url || selfAvatarUrl || undefined,
                });
                return next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });

            return key;
        },
        [selfName, selfEmail, selfAvatarUrl]
    );

    // Confirmar mensaje (reemplazar temp por real)
    const confirmMessage = useCallback((tempId: string, serverId: string) => {
        const serverKey = `msg-${serverId}`;
        seenRef.current.add(serverKey);
        setTimeline((prev) =>
            prev.map((it) => (it.id === tempId ? { ...it, id: serverKey } : it))
        );
    }, []);

    // Suscripción Pusher
    useEffect(() => {
        if (!conversationId || !selfId) return;

        let disposed = false;
        const channelName = `private-conversation-${conversationId}`;
        let ch: any = null;
        let retryTimer: any = null;
        let retries = 0;

        const onChatMessageNew = (raw: any) => {
            const parsed = MessageNewEventSchema.safeParse(raw);
            if (!parsed.success) return;
            const msg = parsed.data;
            const key = `msg-${msg.id}`;
            if (seenRef.current.has(key)) return;
            seenRef.current.add(key);

            const isIncoming = String(msg.sender_id || "") !== String(selfId);
            setTimeline((prev) => {
                // Si es outgoing, buscar y reemplazar temp
                if (!isIncoming) {
                    let replaced = false;
                    const mapped = prev.map((it) => {
                        if (!replaced && it.type === "outgoing" && it.id.startsWith("msg-temp-") && it.body === msg.body) {
                            replaced = true;
                            return { ...it, id: key, created_at: msg.created_at || it.created_at };
                        }
                        return it;
                    });
                    if (replaced) return mapped;
                }

                // Agregar nuevo mensaje
                const next = prev.concat({
                    id: key,
                    type: isIncoming ? "incoming" : "outgoing",
                    message_id: conversationId,
                    body: msg.body,
                    created_at: msg.created_at || new Date().toISOString(),
                    sender_name: msg.sender_name ?? (isIncoming ? counterpartyName : selfName) ?? undefined,
                    sender_email: msg.sender_email ?? undefined,
                    avatar_url: msg.avatar_url ?? (isIncoming ? counterpartyAvatarUrl : selfAvatarUrl) ?? undefined,
                });
                return next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });

            // Marcar leído si es entrante
            if (isIncoming) {
                markAsRead();
            }
        };

        const onConvRead = (payload: any) => {
            try {
                const uid = String(payload?.user_id || "");
                if (uid && uid !== String(selfId)) {
                    setLastReadAt(String(payload?.last_read_at || new Date().toISOString()));
                }
            } catch { }
        };

        const onTyping = (payload: any) => {
            try {
                const uid = String(payload?.user_id || "");
                if (uid && uid !== String(selfId)) {
                    setIsTyping(Boolean(payload?.typing));
                    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                    if (payload?.typing) {
                        typingTimerRef.current = setTimeout(() => setIsTyping(false), 3500);
                    }
                }
            } catch { }
        };

        const bindHandlers = () => {
            if (!ch) return;
            ch.bind("chat:message:new", onChatMessageNew);
            ch.bind("chat:conversation:read", onConvRead);
            ch.bind("chat:typing", onTyping);
        };

        const tryInit = () => {
            if (disposed) return;
            const client = getPusherClient();
            if (!client) {
                retries += 1;
                retryTimer = setTimeout(tryInit, Math.min(30000, 500 * Math.pow(2, retries)));
                return;
            }

            ch = subscribePrivate(channelName, {
                onSubscriptionSucceeded: () => {
                    retries = 0;
                    bindHandlers();
                },
                onSubscriptionError: () => {
                    retries += 1;
                    retryTimer = setTimeout(tryInit, Math.min(30000, 500 * Math.pow(2, retries)));
                },
            });
        };

        tryInit();

        return () => {
            disposed = true;
            try { if (retryTimer) clearTimeout(retryTimer); } catch { }
            try {
                ch?.unbind?.("chat:message:new", onChatMessageNew);
                ch?.unbind?.("chat:conversation:read", onConvRead);
                ch?.unbind?.("chat:typing", onTyping);
                safeUnsubscribe(channelName);
            } catch { }
        };
    }, [conversationId, selfId, selfName, selfAvatarUrl, counterpartyName, counterpartyAvatarUrl, markAsRead]);

    // Auto-scroll al final
    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [timeline]);

    return {
        timeline,
        loading,
        connState,
        isTyping,
        lastReadAt,
        selfName,
        selfEmail,
        selfAvatarUrl,
        addOptimisticMessage,
        confirmMessage,
        scrollRef,
        markAsRead,
        loadOlder,
        hasMoreOlder,
        loadingOlder,
    };
}
