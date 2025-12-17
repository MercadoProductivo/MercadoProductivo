"use client";

import { useEffect, useState } from "react";
import { getConnectionState, onConnectionStateChange } from "@/lib/pusher/client";
import { cn } from "@/lib/utils";

export interface ConnectionIndicatorProps {
    /** Show label text alongside the indicator */
    showLabel?: boolean;
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Additional className */
    className?: string;
}

type ConnectionStatus = "connected" | "connecting" | "disconnected";

const statusConfig = {
    connected: {
        color: "bg-green-500",
        label: "Conectado",
        pulse: false,
    },
    connecting: {
        color: "bg-yellow-500",
        label: "Conectando...",
        pulse: true,
    },
    disconnected: {
        color: "bg-red-500",
        label: "Desconectado",
        pulse: false,
    },
};

const sizeConfig = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
};

/**
 * Visual indicator showing Pusher connection status.
 * 🟢 Connected | 🟡 Connecting | 🔴 Disconnected
 */
export function ConnectionIndicator({
    showLabel = false,
    size = "md",
    className,
}: ConnectionIndicatorProps) {
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");

    useEffect(() => {
        // Get initial state
        const currentState = getConnectionState();
        setStatus(mapPusherState(currentState));

        // Subscribe to changes
        const cleanup = onConnectionStateChange((state) => {
            setStatus(mapPusherState(state));
        });

        return cleanup;
    }, []);

    const config = statusConfig[status];

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <span
                className={cn(
                    "rounded-full",
                    sizeConfig[size],
                    config.color,
                    config.pulse && "animate-pulse"
                )}
                title={config.label}
            />
            {showLabel && (
                <span className="text-xs text-muted-foreground">{config.label}</span>
            )}
        </div>
    );
}

function mapPusherState(state: string): ConnectionStatus {
    switch (state) {
        case "connected":
            return "connected";
        case "connecting":
        case "initialized":
            return "connecting";
        default:
            return "disconnected";
    }
}
