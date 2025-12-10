import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export type SecurityEventType =
    | 'LOGIN_FAILED'
    | 'LOGIN_SUCCESS'
    | 'UNAUTHORIZED_ACCESS'
    | 'RATE_LIMIT_EXCEEDED'
    | 'PASSWORD_RESET_REQUESTED'
    | 'ACCOUNT_UPGRADE';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface SecurityEventData {
    type: SecurityEventType;
    user_id?: string | null;
    user_email?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
    metadata?: Record<string, any>;
    severity: Severity;
}

export async function logSecurityEvent(data: SecurityEventData) {
    try {
        const admin = createAdminClient();

        const { error } = await admin.from('security_events').insert({
            event_type: data.type,
            user_id: data.user_id || null,
            user_email: data.user_email || null,
            ip_address: data.ip_address || null,
            user_agent: data.user_agent || null,
            metadata: data.metadata || {},
            severity: data.severity,
        });

        if (error) {
            logger.error('Failed to log security event', { error: error.message });
        }

        // Log críticos también en consola para revisión inmediata
        if (data.severity === 'CRITICAL' || data.severity === 'HIGH') {
            logger.warn('🚨 SECURITY EVENT', {
                type: data.type,
                severity: data.severity,
                user: data.user_email || data.user_id
            });
        }
    } catch (err) {
        logger.error('Exception in logSecurityEvent', { error: String(err) });
    }
}

export function getClientIP(req: Request): string | null {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');

    if (forwarded) return forwarded.split(',')[0].trim();
    return realIp || null;
}
