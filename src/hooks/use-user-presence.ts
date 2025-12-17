"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseUserPresenceOptions {
    /** Whether presence tracking is enabled */
    enabled?: boolean;
    /** Heartbeat interval in milliseconds (default: 30000) */
    heartbeatInterval?: number;
    /** Whether to mark offline on page hide (default: true) */
    markOfflineOnHide?: boolean;
}

export interface UseUserPresenceReturn {
    /** Whether the heartbeat is active */
    isActive: boolean;
    /** Last heartbeat timestamp */
    lastHeartbeat: Date | null;
    /** Any error from the last heartbeat */
    error: string | null;
    /** Manually trigger a heartbeat */
    sendHeartbeat: () => Promise<void>;
    /** Manually mark as offline */
    markOffline: () => Promise<void>;
}

/**
 * Hook for managing user presence with periodic heartbeat.
 * Automatically sends heartbeat while page is visible and marks offline on unload.
 */
export function useUserPresence(
    options: UseUserPresenceOptions = {}
): UseUserPresenceReturn {
    const {
        enabled = true,
        heartbeatInterval = 30000,
        markOfflineOnHide = true,
    } = options;

    const [isActive, setIsActive] = useState(false);
    const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMountedRef = useRef(true);

    const sendHeartbeat = useCallback(async () => {
        if (!enabled) return;

        try {
            const res = await fetch("/api/chat/presence/heartbeat", {
                method: "POST",
                cache: "no-store",
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.message || `HTTP ${res.status}`);
            }

            if (isMountedRef.current) {
                setLastHeartbeat(new Date());
                setError(null);
                setIsActive(true);
            }
        } catch (e: any) {
            if (isMountedRef.current) {
                setError(e?.message || "Heartbeat failed");
            }
        }
    }, [enabled]);

    const markOffline = useCallback(async () => {
        try {
            // Use sendBeacon for reliability on page unload
            if (typeof navigator !== "undefined" && navigator.sendBeacon) {
                navigator.sendBeacon("/api/chat/presence/heartbeat?offline=true");
            } else {
                await fetch("/api/chat/presence/heartbeat", {
                    method: "DELETE",
                    keepalive: true,
                });
            }
            if (isMountedRef.current) {
                setIsActive(false);
            }
        } catch {
            // Ignore errors on offline marking
        }
    }, []);

    // Start heartbeat interval
    useEffect(() => {
        if (!enabled) return;

        isMountedRef.current = true;

        // Send initial heartbeat
        sendHeartbeat();

        // Set up interval
        intervalRef.current = setInterval(sendHeartbeat, heartbeatInterval);

        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled, heartbeatInterval, sendHeartbeat]);

    // Handle visibility changes
    useEffect(() => {
        if (!enabled || !markOfflineOnHide) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Page is hidden - we could pause heartbeat or mark as "away"
                // For now, we just continue the heartbeat
            } else {
                // Page became visible - send immediate heartbeat
                sendHeartbeat();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [enabled, markOfflineOnHide, sendHeartbeat]);

    // Mark offline on page unload
    useEffect(() => {
        if (!enabled) return;

        const handleBeforeUnload = () => {
            // Use sendBeacon for reliability
            if (typeof navigator !== "undefined" && navigator.sendBeacon) {
                navigator.sendBeacon("/api/chat/presence/heartbeat?offline=true");
            }
        };

        const handlePageHide = () => {
            handleBeforeUnload();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("pagehide", handlePageHide);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.removeEventListener("pagehide", handlePageHide);
        };
    }, [enabled]);

    return {
        isActive,
        lastHeartbeat,
        error,
        sendHeartbeat,
        markOffline,
    };
}
