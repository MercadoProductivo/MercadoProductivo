"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    subscribePrivate,
    getPusherClient,
    onConnectionStateChange,
    safeUnsubscribe,
} from "@/lib/pusher/client";

export interface PusherSubscriptionOptions {
    /** Channel name to subscribe to (e.g., "private-conversation-123") */
    channel: string;
    /** Whether the subscription should be active */
    enabled?: boolean;
    /** Event handlers to bind to the channel */
    handlers?: Record<string, (data: any) => void>;
    /** Callback when subscription succeeds */
    onSubscribed?: () => void;
    /** Callback when subscription fails */
    onError?: (status?: number) => void;
    /** Callback when connection state changes */
    onConnectionChange?: (state: string) => void;
}

export interface PusherSubscriptionState {
    /** Whether currently subscribed */
    isSubscribed: boolean;
    /** Whether currently attempting to connect */
    isConnecting: boolean;
    /** Last error status if any */
    lastError: number | null;
    /** Current retry attempt count */
    retryCount: number;
}

/**
 * Hook for managing Pusher channel subscriptions with automatic retry logic.
 * Handles subscription, event binding, and cleanup automatically.
 */
export function usePusherSubscription(
    options: PusherSubscriptionOptions
): PusherSubscriptionState {
    const { channel, enabled = true, handlers = {}, onSubscribed, onError, onConnectionChange } = options;

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [lastError, setLastError] = useState<number | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const channelRef = useRef<any>(null);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const disposedRef = useRef(false);
    const handlersRef = useRef(handlers);

    // Keep handlers ref updated
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    const clearRetryTimer = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    }, []);

    const unbindHandlers = useCallback(() => {
        if (!channelRef.current) return;
        try {
            Object.keys(handlersRef.current).forEach((event) => {
                channelRef.current?.unbind?.(event);
            });
        } catch (e) {
            // Log but don't throw - unbind errors are expected during cleanup
            if (process.env.NODE_ENV === "development") {
                console.debug("[usePusherSubscription] Unbind error (expected)", e);
            }
        }
    }, []);

    const bindHandlers = useCallback(() => {
        if (!channelRef.current) return;
        Object.entries(handlersRef.current).forEach(([event, handler]) => {
            channelRef.current?.bind?.(event, handler);
        });
    }, []);

    const scheduleRetry = useCallback(
        (status?: number) => {
            if (disposedRef.current) return;

            // Don't retry on 403 (forbidden)
            if (status === 403) {
                console.warn(`[usePusherSubscription] Subscription forbidden (403): ${channel}`);
                setLastError(403);
                setIsConnecting(false);
                onError?.(403);
                return;
            }

            setRetryCount((prev) => prev + 1);
            const attempt = retryCount + 1;
            const base = 500;
            const cap = 30000;
            const backoff = Math.min(cap, Math.round(base * Math.pow(2, attempt)));
            const jitter = Math.floor(Math.random() * Math.min(1000, Math.max(250, Math.floor(backoff * 0.3))));
            const delay = backoff + jitter;

            clearRetryTimer();
            retryTimerRef.current = setTimeout(() => {
                if (!disposedRef.current) {
                    trySubscribe();
                }
            }, delay);
        },
        [channel, retryCount, onError, clearRetryTimer]
    );

    const trySubscribe = useCallback(() => {
        if (disposedRef.current || !enabled) return;

        setIsConnecting(true);
        const pusher = getPusherClient();

        if (!pusher) {
            scheduleRetry(undefined);
            return;
        }

        const ch = subscribePrivate(channel, {
            onSubscriptionSucceeded: () => {
                if (disposedRef.current) return;
                setIsSubscribed(true);
                setIsConnecting(false);
                setRetryCount(0);
                setLastError(null);
                bindHandlers();
                onSubscribed?.();
            },
            onSubscriptionError: (status) => {
                if (disposedRef.current) return;
                console.warn(`[usePusherSubscription] Subscription error (${status}): ${channel}`);
                setLastError(status);
                onError?.(status);
                scheduleRetry(status);
            },
        });

        if (!ch) {
            scheduleRetry(undefined);
            return;
        }

        channelRef.current = ch;
    }, [channel, enabled, bindHandlers, onSubscribed, onError, scheduleRetry]);

    // Main subscription effect
    useEffect(() => {
        if (!enabled || !channel) {
            return;
        }

        disposedRef.current = false;
        trySubscribe();

        return () => {
            disposedRef.current = true;
            clearRetryTimer();
            unbindHandlers();
            try {
                safeUnsubscribe(channel);
            } catch (e) {
                // Log but don't throw - unsubscribe errors are expected during cleanup
                if (process.env.NODE_ENV === "development") {
                    console.debug("[usePusherSubscription] Unsubscribe error (expected)", e);
                }
            }
            channelRef.current = null;
            setIsSubscribed(false);
            setIsConnecting(false);
        };
    }, [channel, enabled, trySubscribe, clearRetryTimer, unbindHandlers]);

    // Connection state change handler
    useEffect(() => {
        if (!enabled || !onConnectionChange) return;

        const cleanup = onConnectionStateChange((state) => {
            onConnectionChange(state);
        });

        return () => {
            cleanup?.();
        };
    }, [enabled, onConnectionChange]);

    return {
        isSubscribed,
        isConnecting,
        lastError,
        retryCount,
    };
}
