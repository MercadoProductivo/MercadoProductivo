/**
 * Utilidades para manejo de precios y conversiones numéricas
 * Centraliza lógica duplicada en múltiples endpoints de billing
 */

import { logger } from "@/lib/logger";

/**
 * Convierte cualquier valor a número, retornando null si no es válido
 */
export function toNum(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim().length > 0) {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

/**
 * Calcula el precio mensual de un plan a partir de sus campos
 */
export function computeMonthlyPrice(plan: {
    price_monthly?: unknown;
    price_monthly_cents?: unknown;
}): number {
    const pm = toNum(plan.price_monthly);
    const pmc = toNum(plan.price_monthly_cents);
    return pm != null ? pm : (pmc != null ? pmc / 100 : 0);
}

/**
 * Calcula el precio anual de un plan a partir de sus campos
 */
export function computeYearlyPrice(plan: {
    price_yearly?: unknown;
    price_yearly_cents?: unknown;
    price_monthly?: unknown;
    price_monthly_cents?: unknown;
}): number {
    const py = toNum(plan.price_yearly);
    const pyc = toNum(plan.price_yearly_cents);
    const monthly = computeMonthlyPrice(plan);

    if (py != null) return py;
    if (pyc != null) return pyc / 100;
    return monthly * 12;
}

/**
 * Formatea un monto en moneda (formato AR por defecto)
 */
export function formatCurrency(
    amount: number,
    currency: string = "ARS",
    locale: string = "es-AR"
): string {
    try {
        return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
    } catch {
        const sign = amount < 0 ? "-" : "";
        const n = Math.abs(amount);
        const [intPart, decPart] = n.toFixed(2).split(".");
        const intWithThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return `${sign}${currency} ${intWithThousands},${decPart}`;
    }
}

/**
 * Log de error silencioso para operaciones no críticas
 * Usar en lugar de catch vacíos
 */
export function logSilentError(context: string, error: unknown, metadata?: Record<string, unknown>): void {
    logger.error(`[Silent] ${context}`, {
        error: error instanceof Error ? error.message : String(error),
        ...metadata,
    });
}
