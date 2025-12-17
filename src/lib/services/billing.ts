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
 * Realiza fetch con timeout y reintentos automáticos para errores transitorios
 */
async function request(endpoint: string, options: RequestOptions = {}) {
    const { timeoutMs = 10000, retries = 0, ...init } = options;
    const url = `${MP_API_URL}${endpoint}`;

    let lastError: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(url, {
                ...init,
                headers: { ...getMPHeaders(), ...init.headers }, // Merge headers, MP headers default
                signal: controller.signal
            });
            clearTimeout(timer);

            // Si es exitoso o es un error de cliente (4xx) que no sea 408/429, retornamos respuesta.
            // 408 (Timeout) y 429 (Too Many Requests) se deberían reintentar.
            // 5xx se reintenta.
            if (res.ok) return res;

            const isRetryable = [408, 429, 500, 502, 503, 504].includes(res.status);
            if (!isRetryable || attempt === retries) {
                // Si no es reintentable o se acabaron los intentos, lanzamos error con detalles
                const text = await res.text().catch(() => "");
                throw new Error(`MP Request Failed (${res.status}): ${text}`);
            }

            // Esperar antes de reintentar (backoff exponencial)
            const delay = Math.min(2000, 300 * 2 ** attempt) + Math.floor(Math.random() * 100);
            await sleep(delay);

        } catch (err: any) {
            clearTimeout(timer);
            lastError = err;
            if (attempt === retries) break;
            const delay = Math.min(2000, 300 * 2 ** attempt);
            await sleep(delay);
        }
    }

    throw lastError || new Error("Unknown fetch error");
}

export class BillingService {
    /**
     * Obtiene detalles de un pago autorizado por ID
     */
    static async getAuthorizedPayment(paymentId: string) {
        const res = await request(`/authorized_payments/${paymentId}`, {
            method: "GET",
            cache: "no-store",
        });
        return res.json();
    }

    /**
     * Obtiene detalles de una suscripción (preapproval) por ID
     */
    static async getPreapproval(preapprovalId: string) {
        const res = await request(`/preapproval/${encodeURIComponent(preapprovalId)}`, {
            method: "GET",
            cache: "no-store",
        });
        return res.json();
    }

    /**
     * Crea una nueva preaprobación (suscripción)
     */
    static async createPreapproval(data: Record<string, any>) {
        const res = await request("/preapproval", {
            method: "POST",
            body: JSON.stringify(data),
            retries: 2, // Reintentar creación en caso de fallos de red
        });
        return res.json();
    }

    /**
     * Actualiza una preaprobación (ej. cancelar o pausar)
     */
    static async updatePreapproval(preapprovalId: string, data: { status: "cancelled" | "paused" }) {
        const res = await request(`/preapproval/${encodeURIComponent(preapprovalId)}`, {
            method: "PUT",
            body: JSON.stringify(data),
            retries: 2,
        });
        return res.json();
    }

    /**
     * Cancela explícitamente una preaprobación
     */
    static async cancelPreapproval(preapprovalId: string) {
        return this.updatePreapproval(preapprovalId, { status: "cancelled" });
    }
}
