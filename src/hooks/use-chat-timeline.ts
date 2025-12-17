"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetch";

export interface ChatTimelineItem {
    id: string;
    type: "incoming" | "outgoing";
    message_id?: string;
    body: string;
    created_at: string;
    sender_id?: string;
    sender_name?: string;
    sender_email?: string;
    avatar_url?: string;
}

export interface UseChatTimelineOptions {
    /** Conversation ID */
    conversationId: string | null;
    /** Current user's ID (to determine incoming vs outgoing) */
    selfId?: string | null;
    /** Counterparty ID (for V2: messages from this user are "incoming") */
    counterpartyId?: string | null;
    /** Whether the timeline should be active */
    enabled?: boolean;
    /** Initial messages limit */
    initialLimit?: number;
    /** Timeout for fetch operations in ms */
    fetchTimeoutMs?: number;
}

export interface UseChatTimelineReturn {
    /** Current timeline items */
    timeline: ChatTimelineItem[];
    /** Whether currently loading */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Whether there are more older messages to load */
    hasMore: boolean;
    /** Add a message to the timeline (for optimistic updates) */
    addMessage: (item: Omit<ChatTimelineItem, "id"> & { id?: string }) => void;
    /** Handle incoming message from real-time event */
    handleRealtimeMessage: (msg: any) => void;
    /** Load older messages for pagination */
    loadOlder: () => Promise<void>;
    /** Refresh the timeline from server */
    refresh: () => Promise<void>;
    /** Last seen timestamp for incremental sync */
    lastSeenAt: string | null;
}

/**
 * Hook for managing chat message timeline state.
 * Handles fetching, pagination, deduplication, and real-time updates.
 */
export function useChatTimeline(
    options: UseChatTimelineOptions
): UseChatTimelineReturn {
    const {
        conversationId,
        selfId,
        counterpartyId,
        enabled = true,
        initialLimit = 50,
        fetchTimeoutMs = 10000,
    } = options;

    const [timeline, setTimeline] = useState<ChatTimelineItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

    // Deduplication set
    const seenIdsRef = useRef<Set<string>>(new Set());
    // Prevent concurrent fetches
    const fetchingRef = useRef(false);
    // Initial load flag
    const initialLoadedRef = useRef(false);

    // Comparator for stable sorting
    const compareItems = useCallback((a: ChatTimelineItem, b: ChatTimelineItem) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        if (ta !== tb) return ta - tb;
        return String(a.id).localeCompare(String(b.id));
    }, []);

    // Determine if a message is incoming based on sender
    const isIncoming = useCallback(
        (senderId?: string) => {
            if (!senderId) return false;
            // If we have counterpartyId, messages from them are incoming
            if (counterpartyId) {
                return String(senderId) === String(counterpartyId);
            }
            // Otherwise, messages NOT from self are incoming
            if (selfId) {
                return String(senderId) !== String(selfId);
            }
            return false;
        },
        [selfId, counterpartyId]
    );

    // Transform API response to timeline item
    const transformMessage = useCallback(
        (msg: any): ChatTimelineItem => {
            const msgId = msg.id ? `msg-${msg.id}` : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            return {
                id: msgId,
                type: isIncoming(msg.sender_id) ? "incoming" : "outgoing",
                message_id: conversationId || undefined,
                body: msg.body || "",
                created_at: msg.created_at || new Date().toISOString(),
                sender_id: msg.sender_id,
                sender_name: msg.sender_name,
                sender_email: msg.sender_email,
                avatar_url: msg.avatar_url,
            };
        },
        [conversationId, isIncoming]
    );

    // Add message to timeline with deduplication
    const addMessage = useCallback(
        (item: Omit<ChatTimelineItem, "id"> & { id?: string }) => {
            const id = item.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            if (seenIdsRef.current.has(id)) return;

            seenIdsRef.current.add(id);
            setTimeline((prev) => {
                const newItem: ChatTimelineItem = { ...item, id };
                const next = [...prev, newItem];
                next.sort(compareItems);
                return next;
            });

            // Update last seen
            if (!lastSeenAt || new Date(item.created_at).getTime() > new Date(lastSeenAt).getTime()) {
                setLastSeenAt(item.created_at);
            }
        },
        [compareItems, lastSeenAt]
    );

    // Handle real-time message event
    const handleRealtimeMessage = useCallback(
        (msg: any) => {
            const item = transformMessage(msg);
            addMessage(item);
        },
        [transformMessage, addMessage]
    );

    // Fetch messages from API
    const fetchMessages = useCallback(
        async (opts: { before?: string; after?: string; limit?: number } = {}) => {
            if (!conversationId || fetchingRef.current) return [];

            fetchingRef.current = true;
            try {
                const url = new URL(
                    `/api/chat/conversations/${conversationId}/messages`,
                    typeof window !== "undefined" ? window.location.origin : "http://localhost"
                );
                url.searchParams.set("limit", String(opts.limit || initialLimit));
                if (opts.before) url.searchParams.set("before", opts.before);
                if (opts.after) url.searchParams.set("after", opts.after);

                const res = await fetchWithTimeout(url.toString(), {
                    cache: "no-store",
                    timeoutMs: fetchTimeoutMs,
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
                }

                const data = await res.json();
                return Array.isArray(data?.messages) ? data.messages : [];
            } finally {
                fetchingRef.current = false;
            }
        },
        [conversationId, initialLimit, fetchTimeoutMs]
    );

    // Initial load
    useEffect(() => {
        if (!enabled || !conversationId || initialLoadedRef.current) return;

        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const messages = await fetchMessages({ limit: initialLimit });
                const items = messages.map(transformMessage);

                // Seed deduplication
                items.forEach((it: ChatTimelineItem) => seenIdsRef.current.add(it.id));

                // Sort and set timeline
                items.sort(compareItems);
                setTimeline(items);
                setHasMore(messages.length >= initialLimit);

                // Update last seen
                if (items.length > 0) {
                    const maxAt = items.reduce((max: string, it: ChatTimelineItem) =>
                        new Date(it.created_at).getTime() > new Date(max).getTime() ? it.created_at : max,
                        items[0].created_at
                    );
                    setLastSeenAt(maxAt);
                }

                initialLoadedRef.current = true;
            } catch (e: any) {
                setError(e?.message || "Failed to load messages");
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [enabled, conversationId, fetchMessages, transformMessage, compareItems, initialLimit]);

    // Load older messages (pagination)
    const loadOlder = useCallback(async () => {
        if (!conversationId || isLoading || !hasMore || timeline.length === 0) return;

        setIsLoading(true);
        try {
            const oldest = timeline[0];
            const messages = await fetchMessages({ before: oldest.created_at, limit: initialLimit });

            if (messages.length === 0) {
                setHasMore(false);
                return;
            }

            const items = messages.map(transformMessage).filter(
                (it: ChatTimelineItem) => !seenIdsRef.current.has(it.id)
            );

            items.forEach((it: ChatTimelineItem) => seenIdsRef.current.add(it.id));

            setTimeline((prev) => {
                const next = [...items, ...prev];
                next.sort(compareItems);
                return next;
            });

            setHasMore(messages.length >= initialLimit);
        } catch (e: any) {
            console.warn("Failed to load older messages:", e);
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, isLoading, hasMore, timeline, fetchMessages, transformMessage, compareItems, initialLimit]);

    // Refresh timeline (for reconnection sync)
    const refresh = useCallback(async () => {
        if (!conversationId) return;

        try {
            const after = lastSeenAt
                ? new Date(new Date(lastSeenAt).getTime() - 1000).toISOString()
                : undefined;

            const messages = await fetchMessages({ after, limit: 200 });
            const items = messages.map(transformMessage).filter(
                (it: ChatTimelineItem) => !seenIdsRef.current.has(it.id)
            );

            if (items.length === 0) return;

            items.forEach((it: ChatTimelineItem) => seenIdsRef.current.add(it.id));

            setTimeline((prev) => {
                const map = new Map(prev.map((it) => [it.id, it] as const));
                items.forEach((it: ChatTimelineItem) => {
                    if (!map.has(it.id)) map.set(it.id, it);
                });
                const next = Array.from(map.values());
                next.sort(compareItems);
                return next;
            });

            // Update last seen
            const maxAt = items.reduce((max: string, it: ChatTimelineItem) =>
                new Date(it.created_at).getTime() > new Date(max).getTime() ? it.created_at : max,
                items[0].created_at
            );
            if (!lastSeenAt || new Date(maxAt).getTime() > new Date(lastSeenAt).getTime()) {
                setLastSeenAt(maxAt);
            }
        } catch (e) {
            console.warn("Failed to refresh timeline:", e);
        }
    }, [conversationId, lastSeenAt, fetchMessages, transformMessage, compareItems]);

    // Reset on conversation change
    useEffect(() => {
        return () => {
            seenIdsRef.current.clear();
            initialLoadedRef.current = false;
        };
    }, [conversationId]);

    return {
        timeline,
        isLoading,
        error,
        hasMore,
        addMessage,
        handleRealtimeMessage,
        loadOlder,
        refresh,
        lastSeenAt,
    };
}
