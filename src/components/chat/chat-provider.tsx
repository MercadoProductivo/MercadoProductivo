"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePusherSubscription } from "@/hooks/use-pusher-subscription";
import { useChatNotifications } from "@/hooks/use-chat-notifications";
import { useUserPresence } from "@/hooks/use-user-presence";
import { chatLogger } from "@/lib/chat/logger";
import { showMessageToast, showConnectionToast } from "./chat-toasts";
import { getConnectionState, onConnectionStateChange, getPusherClient } from "@/lib/pusher/client";

interface ChatContextValue {
    /** Current user ID */
    userId: string | null;
    /** Whether the chat system is ready */
    isReady: boolean;
    /** Current connection state */
    connectionState: string;
    /** Unread message count */
    unreadCount: number;
    /** Set unread count */
    setUnreadCount: (count: number | ((prev: number) => number)) => void;
    /** Play notification sound */
    playNotificationSound: () => void;
    /** Show browser notification */
    showNotification: (title: string, body: string, onClick?: () => void) => void;
    /** Request notification permission */
    requestNotificationPermission: () => Promise<NotificationPermission>;
    /** Notification permission status */
    notificationPermission: NotificationPermission | null;
    /** Whether notifications are supported */
    notificationsSupported: boolean;
    /** Notification settings */
    notificationSettings: {
        soundEnabled: boolean;
        browserEnabled: boolean;
    };
    /** Update notification settings */
    updateNotificationSettings: (settings: Partial<{ soundEnabled: boolean; browserEnabled: boolean }>) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatProviderProps {
    children: React.ReactNode;
    /** Current user ID (required for real-time features) */
    userId: string | null;
    /** Enable presence tracking */
    enablePresence?: boolean;
    /** Enable notifications */
    enableNotifications?: boolean;
}

/**
 * Provider component that integrates all chat features:
 * - Pusher connection management
 * - User presence tracking
 * - Notifications (sound + browser)
 * - Logging
 */
export function ChatProvider({
    children,
    userId,
    enablePresence = true,
    enableNotifications = true,
}: ChatProviderProps) {
    const [connectionState, setConnectionState] = useState<string>("disconnected");
    const [isReady, setIsReady] = useState(false);
    const [notificationSettings, setNotificationSettings] = useState({
        soundEnabled: true,
        browserEnabled: true,
    });

    // Previous connection state for transitions
    const prevConnectionState = useRef<string>("disconnected");

    // Initialize presence tracking
    useUserPresence({
        enabled: enablePresence && !!userId,
        heartbeatInterval: 30000,
    });

    // Initialize notifications
    const {
        unreadCount,
        setUnreadCount,
        playSound,
        showNotification,
        requestPermission,
        permission,
        isSupported,
        updateOptions,
    } = useChatNotifications({
        soundEnabled: notificationSettings.soundEnabled && enableNotifications,
        browserNotificationsEnabled: notificationSettings.browserEnabled && enableNotifications,
    });

    // Subscribe to user-specific channel for global events
    const userChannel = userId ? `private-user-${userId}` : "";
    const { isSubscribed } = usePusherSubscription({
        channel: userChannel,
        enabled: !!userId,
        handlers: useMemo(
            () => ({
                "chat:message:new": (data: any) => {
                    chatLogger.message("received", data?.id, data);

                    // Update unread count
                    setUnreadCount((prev) => prev + 1);

                    // Show notification if enabled
                    if (notificationSettings.soundEnabled) {
                        playSound();
                    }
                    if (notificationSettings.browserEnabled) {
                        showMessageToast({
                            senderName: data?.sender_name || "Nuevo mensaje",
                            messagePreview: data?.body || "",
                        });
                    }
                },
                "chat:conversation:new": (data: any) => {
                    chatLogger.info("Conversation", "New conversation started", data);
                },
                "chat:message:read": (data: any) => {
                    chatLogger.message("read", data?.message_id, data);
                },
            }),
            [notificationSettings.soundEnabled, notificationSettings.browserEnabled, playSound, setUnreadCount]
        ),
        onSubscribed: () => {
            chatLogger.subscription("subscribed", userChannel);
            setIsReady(true);
        },
        onError: (status) => {
            chatLogger.subscription("error", userChannel, { status });
        },
    });

    // Track connection state changes
    useEffect(() => {
        const handleStateChange = (state: string) => {
            const prev = prevConnectionState.current;
            prevConnectionState.current = state;

            setConnectionState(state);
            chatLogger.connection(state, { previous: prev });

            // Show toast on significant transitions
            if (prev !== state) {
                if (state === "connected" && prev !== "connected") {
                    showConnectionToast("connected");
                } else if (state === "disconnected" || state === "failed" || state === "unavailable") {
                    if (prev === "connected") {
                        showConnectionToast("disconnected");
                    }
                } else if (state === "connecting" && prev === "disconnected") {
                    showConnectionToast("reconnecting");
                }
            }
        };

        // Initialize Pusher client
        getPusherClient();

        // Get initial state
        handleStateChange(getConnectionState());

        // Subscribe to changes
        const cleanup = onConnectionStateChange(handleStateChange);

        return cleanup;
    }, []);

    // Update notification options when settings change
    useEffect(() => {
        updateOptions({
            soundEnabled: notificationSettings.soundEnabled,
            browserNotificationsEnabled: notificationSettings.browserEnabled,
        });
    }, [notificationSettings, updateOptions]);

    const updateNotificationSettings = useCallback(
        (settings: Partial<{ soundEnabled: boolean; browserEnabled: boolean }>) => {
            setNotificationSettings((prev) => ({ ...prev, ...settings }));
        },
        []
    );

    const contextValue = useMemo<ChatContextValue>(
        () => ({
            userId,
            isReady: isReady && isSubscribed,
            connectionState,
            unreadCount,
            setUnreadCount,
            playNotificationSound: playSound,
            showNotification,
            requestNotificationPermission: requestPermission,
            notificationPermission: permission,
            notificationsSupported: isSupported,
            notificationSettings,
            updateNotificationSettings,
        }),
        [
            userId,
            isReady,
            isSubscribed,
            connectionState,
            unreadCount,
            setUnreadCount,
            playSound,
            showNotification,
            requestPermission,
            permission,
            isSupported,
            notificationSettings,
            updateNotificationSettings,
        ]
    );

    return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
}

/**
 * Hook to access chat context.
 */
export function useChatContext(): ChatContextValue {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChatContext must be used within a ChatProvider");
    }
    return context;
}

/**
 * Hook to access chat context, returning null if not in provider.
 */
export function useChatContextSafe(): ChatContextValue | null {
    return useContext(ChatContext);
}
