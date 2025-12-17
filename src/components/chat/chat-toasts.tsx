"use client";

import { toast } from "sonner";
import { MessageCircle, User } from "lucide-react";

export interface ChatToastOptions {
    /** Sender name */
    senderName?: string;
    /** Message preview (truncated) */
    messagePreview?: string;
    /** Avatar URL */
    avatarUrl?: string;
    /** Click handler */
    onClick?: () => void;
    /** Duration in ms (default: 5000) */
    duration?: number;
}

/**
 * Show a toast notification for a new chat message.
 * Uses Sonner toast library for consistent styling.
 */
export function showMessageToast(options: ChatToastOptions) {
    const {
        senderName = "Nuevo mensaje",
        messagePreview = "",
        onClick,
        duration = 5000,
    } = options;

    // Truncate preview
    const preview =
        messagePreview.length > 50
            ? messagePreview.substring(0, 50) + "..."
            : messagePreview;

    toast.message(senderName, {
        description: preview,
        duration,
        icon: <MessageCircle className="h-5 w-5 text-primary" />,
        action: onClick
            ? {
                label: "Ver",
                onClick,
            }
            : undefined,
    });
}

/**
 * Show a toast notification for user presence change.
 */
export function showPresenceToast(
    userName: string,
    isOnline: boolean,
    onClick?: () => void
) {
    const message = isOnline
        ? `${userName} está en línea`
        : `${userName} se desconectó`;

    toast.message(message, {
        duration: 3000,
        icon: (
            <div className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
        ),
        action: onClick
            ? {
                label: "Ver perfil",
                onClick,
            }
            : undefined,
    });
}

/**
 * Show a toast notification for connection status change.
 */
export function showConnectionToast(status: "connected" | "disconnected" | "reconnecting") {
    const config = {
        connected: {
            message: "Conectado al chat",
            icon: <div className="h-2 w-2 rounded-full bg-green-500" />,
            duration: 2000,
        },
        disconnected: {
            message: "Desconectado - Intentando reconectar...",
            icon: <div className="h-2 w-2 rounded-full bg-red-500" />,
            duration: 5000,
        },
        reconnecting: {
            message: "Reconectando...",
            icon: <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />,
            duration: 3000,
        },
    };

    const { message, icon, duration } = config[status];

    toast.message(message, {
        duration,
        icon,
    });
}

/**
 * Show a toast for typing indicator (optional, can be intrusive).
 */
export function showTypingToast(userName: string) {
    toast.message(`${userName} está escribiendo...`, {
        duration: 3000,
        id: `typing-${userName}`, // Deduplicate
        icon: <User className="h-4 w-4 text-muted-foreground" />,
    });
}
