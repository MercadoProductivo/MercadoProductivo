/**
 * Chat system logger for diagnostics and debugging.
 * Provides structured logging with different severity levels.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    component: string;
    message: string;
    data?: Record<string, any>;
}

const LOG_PREFIX = "[Chat]";
const MAX_HISTORY = 100;
const history: LogEntry[] = [];

// Check if debug mode is enabled
function isDebugEnabled(): boolean {
    if (typeof window === "undefined") return false;
    try {
        return (
            localStorage.getItem("chat_debug") === "true" ||
            process.env.NODE_ENV === "development"
        );
    } catch {
        return false;
    }
}

function createEntry(
    level: LogLevel,
    component: string,
    message: string,
    data?: Record<string, any>
): LogEntry {
    return {
        timestamp: new Date().toISOString(),
        level,
        component,
        message,
        data,
    };
}

function addToHistory(entry: LogEntry) {
    history.push(entry);
    if (history.length > MAX_HISTORY) {
        history.shift();
    }
}

function formatMessage(entry: LogEntry): string {
    return `${LOG_PREFIX} [${entry.component}] ${entry.message}`;
}

export const chatLogger = {
    /**
     * Debug level - only shown in development or when debug mode is enabled
     */
    debug(component: string, message: string, data?: Record<string, any>) {
        const entry = createEntry("debug", component, message, data);
        addToHistory(entry);

        if (isDebugEnabled()) {
            if (data) {
                console.debug(formatMessage(entry), data);
            } else {
                console.debug(formatMessage(entry));
            }
        }
    },

    /**
     * Info level - general information
     */
    info(component: string, message: string, data?: Record<string, any>) {
        const entry = createEntry("info", component, message, data);
        addToHistory(entry);

        if (data) {
            console.info(formatMessage(entry), data);
        } else {
            console.info(formatMessage(entry));
        }
    },

    /**
     * Warning level - potential issues
     */
    warn(component: string, message: string, data?: Record<string, any>) {
        const entry = createEntry("warn", component, message, data);
        addToHistory(entry);

        if (data) {
            console.warn(formatMessage(entry), data);
        } else {
            console.warn(formatMessage(entry));
        }
    },

    /**
     * Error level - failures and exceptions
     */
    error(component: string, message: string, data?: Record<string, any>) {
        const entry = createEntry("error", component, message, data);
        addToHistory(entry);

        if (data) {
            console.error(formatMessage(entry), data);
        } else {
            console.error(formatMessage(entry));
        }
    },

    /**
     * Get log history for debugging
     */
    getHistory(): LogEntry[] {
        return [...history];
    },

    /**
     * Clear log history
     */
    clearHistory() {
        history.length = 0;
    },

    /**
     * Export logs as JSON string
     */
    exportLogs(): string {
        return JSON.stringify(history, null, 2);
    },

    /**
     * Log connection state change
     */
    connection(state: string, details?: Record<string, any>) {
        this.info("Connection", `State changed to: ${state}`, details);
    },

    /**
     * Log message event
     */
    message(action: "sent" | "received" | "delivered" | "read", messageId: string, details?: Record<string, any>) {
        this.debug("Message", `${action}: ${messageId}`, details);
    },

    /**
     * Log subscription event
     */
    subscription(action: "subscribed" | "unsubscribed" | "error", channel: string, details?: Record<string, any>) {
        const level = action === "error" ? "warn" : "debug";
        this[level]("Subscription", `${action}: ${channel}`, details);
    },

    /**
     * Log presence event
     */
    presence(action: "online" | "offline" | "heartbeat", userId?: string, details?: Record<string, any>) {
        this.debug("Presence", `${action}${userId ? `: ${userId}` : ""}`, details);
    },
};

// Expose to window for debugging in browser console
if (typeof window !== "undefined") {
    (window as any).__chatLogger = chatLogger;
}
