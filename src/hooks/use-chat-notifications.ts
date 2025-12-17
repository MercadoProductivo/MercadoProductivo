"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatNotificationOptions {
    /** Enable sound notifications */
    soundEnabled?: boolean;
    /** Enable browser notifications */
    browserNotificationsEnabled?: boolean;
    /** Enable visual badge */
    badgeEnabled?: boolean;
    /** Sound file URL */
    soundUrl?: string;
    /** Volume (0-1) */
    volume?: number;
}

export interface UseChatNotificationsReturn {
    /** Current unread count */
    unreadCount: number;
    /** Update unread count */
    setUnreadCount: (count: number | ((prev: number) => number)) => void;
    /** Play notification sound */
    playSound: () => void;
    /** Show browser notification */
    showNotification: (title: string, body: string, onClick?: () => void) => void;
    /** Request browser notification permission */
    requestPermission: () => Promise<NotificationPermission>;
    /** Current notification permission status */
    permission: NotificationPermission | null;
    /** Whether notifications are supported */
    isSupported: boolean;
    /** Update options */
    updateOptions: (opts: Partial<ChatNotificationOptions>) => void;
}

const DEFAULT_OPTIONS: ChatNotificationOptions = {
    soundEnabled: true,
    browserNotificationsEnabled: true,
    badgeEnabled: true,
    soundUrl: "/sounds/notification.mp3",
    volume: 0.5,
};

/**
 * Hook for managing chat notifications with sound and browser notifications.
 */
export function useChatNotifications(
    initialOptions: ChatNotificationOptions = {}
): UseChatNotificationsReturn {
    const [unreadCount, setUnreadCount] = useState(0);
    const [permission, setPermission] = useState<NotificationPermission | null>(null);
    const [options, setOptions] = useState<ChatNotificationOptions>({
        ...DEFAULT_OPTIONS,
        ...initialOptions,
    });

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isSupported = typeof window !== "undefined" && "Notification" in window;

    // Initialize audio element
    useEffect(() => {
        if (typeof window === "undefined" || !options.soundEnabled) return;

        try {
            audioRef.current = new Audio(options.soundUrl);
            audioRef.current.volume = options.volume || 0.5;
            // Preload for faster playback
            audioRef.current.preload = "auto";
        } catch (e) {
            console.warn("Failed to initialize notification sound:", e);
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [options.soundEnabled, options.soundUrl, options.volume]);

    // Check permission on mount
    useEffect(() => {
        if (isSupported) {
            setPermission(Notification.permission);
        }
    }, [isSupported]);

    // Update document title with unread count
    useEffect(() => {
        if (typeof document === "undefined" || !options.badgeEnabled) return;

        const originalTitle = document.title.replace(/^\(\d+\)\s*/, "");
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) ${originalTitle}`;
        } else {
            document.title = originalTitle;
        }

        return () => {
            document.title = originalTitle;
        };
    }, [unreadCount, options.badgeEnabled]);

    const playSound = useCallback(() => {
        if (!options.soundEnabled || !audioRef.current) return;

        try {
            // Reset to start if already playing
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch((e) => {
                // Autoplay may be blocked by browser
                console.debug("Notification sound blocked:", e);
            });
        } catch (e) {
            console.warn("Failed to play notification sound:", e);
        }
    }, [options.soundEnabled]);

    const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
        if (!isSupported) return "denied";

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result;
        } catch (e) {
            console.warn("Failed to request notification permission:", e);
            return "denied";
        }
    }, [isSupported]);

    const showNotification = useCallback(
        (title: string, body: string, onClick?: () => void) => {
            if (!isSupported || !options.browserNotificationsEnabled) return;
            if (permission !== "granted") return;

            try {
                const notification = new Notification(title, {
                    body,
                    icon: "/icon-192.png",
                    badge: "/icon-192.png",
                    tag: "chat-notification",
                });

                if (onClick) {
                    notification.onclick = () => {
                        window.focus();
                        onClick();
                        notification.close();
                    };
                }

                // Auto-close after 5 seconds
                setTimeout(() => notification.close(), 5000);
            } catch (e) {
                console.warn("Failed to show notification:", e);
            }
        },
        [isSupported, options.browserNotificationsEnabled, permission]
    );

    const updateOptions = useCallback((opts: Partial<ChatNotificationOptions>) => {
        setOptions((prev) => ({ ...prev, ...opts }));
    }, []);

    return {
        unreadCount,
        setUnreadCount,
        playSound,
        showNotification,
        requestPermission,
        permission,
        isSupported,
        updateOptions,
    };
}
