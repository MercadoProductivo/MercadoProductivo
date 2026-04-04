import { getMPHeaders } from "@/lib/mercadopago/config";
import { logger } from "@/lib/logger";

const MP_API_URL = "https://api.mercadopago.com";

interface RequestOptions extends RequestInit {
    timeoutMs?: number;
    retries?: number;
}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Realiza fetch con timeout y reintentos automáticos para errores transitorios.
 * Errores 408/429/5xx se reintentan con backoff exponencial.
 */
async function request(endpoint: string, options: RequestOptions = {}) {
    const { timeoutMs = 10000, retries = 0, ...init } = options;
    const url = `${MP_API_URL}${endpoint}`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(url, {
                ...init,
                headers: { ...getMPHeaders(), ...(init.headers as Record<string, string> | undefined) },
                signal: controller.signal,
            });
            clearTimeout(timer);

            if (res.ok) return res;

            const isRetryable = [408, 429, 500, 502, 503, 504].includes(res.status);
            if (!isRetryable || attempt === retries) {
                const text = await res.text().catch(() => "");
                throw new Error(`MP Request Failed (${res.status}): ${text}`);
            }

            // Backoff exponencial con jitter
            const delay = Math.min(2000, 300 * 2 ** attempt) + Math.floor(Math.random() * 100);
            await sleep(delay);
        } catch (err: unknown) {
            clearTimeout(timer);
            lastError = err;
            if (attempt === retries) break;
            const delay = Math.min(2000, 300 * 2 ** attempt);
            await sleep(delay);
        }
    }

    throw lastError || new Error("Unknown fetch error");
}

/**
 * Cliente HTTP para la API de MercadoPago.
 *
 * Responsabilidad: comunicación con MP (requests, retry, timeout).
 * NO contiene lógica de negocio — para eso usar BillingService.
 *
 * @see services/billing-service.ts
 */
export class MPApiClient {
    /**
     * Obtiene detalles de un pago autorizado por ID.
     */
    static async getAuthorizedPayment(paymentId: string) {
        const res = await request(`/authorized_payments/${encodeURIComponent(paymentId)}`, {
            method: "GET",
            cache: "no-store",
        });
        return res.json() as Promise<Record<string, unknown>>;
    }

    /**
     * Obtiene detalles de una suscripción (preapproval) por ID.
     */
    static async getPreapproval(preapprovalId: string) {
        const res = await request(`/preapproval/${encodeURIComponent(preapprovalId)}`, {
            method: "GET",
            cache: "no-store",
        });
        return res.json() as Promise<Record<string, unknown>>;
    }

    /**
     * Crea una nueva preaprobación (suscripción).
     *
     * Incluye X-Idempotency-Key basado en external_reference para prevenir
     * duplicados ante reintentos de red.
     */
    static async createPreapproval(data: Record<string, unknown>) {
        // Idempotency key estable por (userId:planCode:interval) — reintentos devuelven el mismo preapproval
        const idempotencyKey =
            typeof data.external_reference === "string" && data.external_reference
                ? `preapproval-${data.external_reference}`
                : `preapproval-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const res = await request("/preapproval", {
            method: "POST",
            body: JSON.stringify(data),
            headers: { "X-Idempotency-Key": idempotencyKey },
            retries: 2,
        });
        return res.json() as Promise<Record<string, unknown>>;
    }

    /**
     * Actualiza el estado de una preaprobación.
     * Soporta: "authorized" | "cancelled" | "paused"
     */
    static async updatePreapproval(
        preapprovalId: string,
        data: { status: "authorized" | "cancelled" | "paused" } & Record<string, unknown>,
    ) {
        const res = await request(`/preapproval/${encodeURIComponent(preapprovalId)}`, {
            method: "PUT",
            body: JSON.stringify(data),
            retries: 2,
        });
        return res.json() as Promise<Record<string, unknown>>;
    }

    /**
     * Cancela explícitamente una preaprobación.
     */
    static async cancelPreapproval(preapprovalId: string) {
        return this.updatePreapproval(preapprovalId, { status: "cancelled" });
    }

    /**
     * Pausa una preaprobación (ej. en downgrade pendiente de renovación).
     */
    static async pausePreapproval(preapprovalId: string) {
        return this.updatePreapproval(preapprovalId, { status: "paused" });
    }

    /**
     * Re-activa una preaprobación pausada.
     */
    static async authorizePreapproval(preapprovalId: string) {
        return this.updatePreapproval(preapprovalId, { status: "authorized" });
    }
}

// ── Re-export de compatibilidad ────────────────────────────────────────────────
// Permite que código legacy que importaba BillingService desde este módulo
// siga funcionando sin cambios hasta ser migrado.
/** @deprecated Usar MPApiClient directamente */
export { MPApiClient as BillingService };
