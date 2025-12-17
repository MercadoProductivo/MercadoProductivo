"use server";

import { logSecurityEvent as logEvent, SecurityEventData } from "@/lib/security/security-logger";

/**
 * Server action wrapper for logging security events.
 * Allows client components to log events without exposing admin secrets.
 */
export async function logSecurityEventAction(data: SecurityEventData) {
    try {
        await logEvent(data);
    } catch (error) {
        // Fail silently on client side errors, but log on server
        console.error("Failed to log security event via action:", error);
    }
}
