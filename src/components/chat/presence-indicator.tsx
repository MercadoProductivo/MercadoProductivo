"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface PresenceIndicatorProps {
    /** User ID to show presence for */
    userId: string;
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Additional className */
    className?: string;
    /** Whether to show "last seen" text */
    showLastSeen?: boolean;
}

const sizeConfig = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
};

/**
 * User presence indicator showing online/offline status.
 */
export function PresenceIndicator({
    userId,
    size = "md",
    className,
    showLastSeen = false,
}: PresenceIndicatorProps) {
    const [isOnline, setIsOnline] = useState<boolean | null>(null);
    const [lastSeen, setLastSeen] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;

        const fetchPresence = async () => {
            try {
                const res = await fetch(`/api/chat/presence/${userId}`, {
                    cache: "no-store",
                });
                if (res.ok) {
                    const data = await res.json();
                    setIsOnline(data.is_online);
                    setLastSeen(data.last_seen_at);
                }
            } catch {
                // Ignore errors, assume offline
                setIsOnline(false);
            }
        };

        fetchPresence();

        // Refresh presence every 60 seconds
        const interval = setInterval(fetchPresence, 60000);

        return () => clearInterval(interval);
    }, [userId]);

    // While loading, show neutral state
    if (isOnline === null) {
        return (
            <div className={cn("flex items-center gap-1.5", className)}>
                <span
                    className={cn(
                        "rounded-full bg-gray-300",
                        sizeConfig[size]
                    )}
                />
            </div>
        );
    }

    const formatLastSeen = (iso: string | null): string => {
        if (!iso) return "Nunca visto";
        try {
            const date = new Date(iso);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return "Hace un momento";
            if (diffMins < 60) return `Hace ${diffMins} min`;
            if (diffHours < 24) return `Hace ${diffHours}h`;
            if (diffDays < 7) return `Hace ${diffDays} días`;
            return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
        } catch {
            return "Desconocido";
        }
    };

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <span
                className={cn(
                    "rounded-full",
                    sizeConfig[size],
                    isOnline ? "bg-green-500" : "bg-gray-400"
                )}
                title={isOnline ? "En línea" : `Últ. vez: ${formatLastSeen(lastSeen)}`}
            />
            {showLastSeen && !isOnline && (
                <span className="text-xs text-muted-foreground">
                    {formatLastSeen(lastSeen)}
                </span>
            )}
            {showLastSeen && isOnline && (
                <span className="text-xs text-green-600">En línea</span>
            )}
        </div>
    );
}
