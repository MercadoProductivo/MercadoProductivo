"use client";

import { cn } from "@/lib/utils";

export interface MessageStatusProps {
    /** Message delivery status */
    status: "sending" | "sent" | "delivered" | "read" | "failed";
    /** Additional className */
    className?: string;
    /** Whether to show text label */
    showLabel?: boolean;
}

/**
 * Message status indicator with checkmarks.
 * ⏳ Sending | ✓ Sent | ✓ Delivered | ✓✓ Read | ❌ Failed
 */
export function MessageStatus({
    status,
    className,
    showLabel = false,
}: MessageStatusProps) {
    const config = getStatusConfig(status);

    return (
        <span
            className={cn("inline-flex items-center gap-0.5", className)}
            title={config.label}
        >
            {config.icon}
            {showLabel && (
                <span className="ml-1 text-[10px] opacity-70">{config.label}</span>
            )}
        </span>
    );
}

function getStatusConfig(status: MessageStatusProps["status"]) {
    switch (status) {
        case "sending":
            return {
                icon: (
                    <svg
                        className="h-3 w-3 animate-pulse text-current opacity-50"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32">
                            <animate attributeName="stroke-dashoffset" dur="1s" values="32;0" repeatCount="indefinite" />
                        </circle>
                    </svg>
                ),
                label: "Enviando...",
            };

        case "sent":
            return {
                icon: (
                    <svg
                        className="h-3 w-3 text-current opacity-60"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                ),
                label: "Enviado",
            };

        case "delivered":
            return {
                icon: (
                    <svg
                        className="h-3 w-3 text-blue-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                ),
                label: "Entregado",
            };

        case "read":
            return {
                icon: (
                    <span className="flex">
                        <svg
                            className="h-3 w-3 text-blue-500 -mr-1"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <svg
                            className="h-3 w-3 text-blue-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </span>
                ),
                label: "Leído",
            };

        case "failed":
            return {
                icon: (
                    <svg
                        className="h-3 w-3 text-red-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                ),
                label: "Error al enviar",
            };

        default:
            return {
                icon: null,
                label: "",
            };
    }
}

/**
 * Determine message status from timestamps
 */
export function getMessageStatus(message: {
    created_at?: string;
    delivered_at?: string | null;
    read_at?: string | null;
    sending?: boolean;
    failed?: boolean;
}): MessageStatusProps["status"] {
    if (message.failed) return "failed";
    if (message.sending) return "sending";
    if (message.read_at) return "read";
    if (message.delivered_at) return "delivered";
    if (message.created_at) return "sent";
    return "sending";
}
