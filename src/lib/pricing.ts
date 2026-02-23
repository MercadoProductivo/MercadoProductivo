/**
 * Utilidades centralizadas para manejo de precios
 * ÚNICA FUENTE DE VERDAD para cálculos de pricing en toda la app
 */

import { logger } from "@/lib/logger";

// ============================================================================
// TIPOS
// ============================================================================

export interface PlanPriceFields {
    price_monthly?: number | string | null;
    price_monthly_cents?: number | string | null;
    price_yearly?: number | string | null;
    price_yearly_cents?: number | string | null;
    currency?: string | null;
}

export interface PriceResult {
    monthly: number | null;
    yearly: number | null;
    currency: string;
    savings: number;
    savingsPercent: number;
}

// ============================================================================
// CONVERSIÓN NUMÉRICA
// ============================================================================

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

// ============================================================================
// CÁLCULO DE PRECIOS
// ============================================================================

/**
 * Calcula el precio mensual de un plan
 * Prioriza campos legacy (price_monthly) sobre _cents ya que _cents están NULL en DB
 */
export function computeMonthlyPrice(plan: PlanPriceFields): number {
    const pm = toNum(plan.price_monthly);
    const pmc = toNum(plan.price_monthly_cents);

    if (pm != null) return pm;
    if (pmc != null) return pmc / 100;
    return 0;
}

/**
 * Calcula el precio anual de un plan
 * Fallback: monthly * 10 (2 meses gratis = 17% descuento)
 */
export function computeYearlyPrice(plan: PlanPriceFields): number {
    const py = toNum(plan.price_yearly);
    const pyc = toNum(plan.price_yearly_cents);

    if (py != null) return py;
    if (pyc != null) return pyc / 100;

    // Fallback: 10 meses (no 12) para reflejar 2 meses gratis
    const monthly = computeMonthlyPrice(plan);
    return monthly * 10;
}

/**
 * Calcula todos los valores de precio de un plan
 * Incluye ahorro y porcentaje de descuento
 */
export function computePrice(plan: PlanPriceFields): PriceResult {
    const currency = (plan.currency ?? "ARS").toUpperCase();
    const monthly = computeMonthlyPrice(plan);
    const yearly = computeYearlyPrice(plan);

    // Calcular ahorro comparando con 12 meses completos
    const fullYearCost = monthly * 12;
    const savings = fullYearCost - yearly;
    const savingsPercent = fullYearCost > 0 ? Math.round((savings / fullYearCost) * 100) : 0;

    return {
        monthly: monthly > 0 ? Number(monthly.toFixed(2)) : null,
        yearly: yearly > 0 ? Number(yearly.toFixed(2)) : null,
        currency,
        savings: Number(savings.toFixed(2)),
        savingsPercent,
    };
}

// ============================================================================
// FORMATEO DE MONEDA
// ============================================================================

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
        const parts = n.toFixed(2).split(".");
        const intPart = parts[0] ?? "0";
        const decPart = parts[1] ?? "00";
        const intWithThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return `${sign}${currency} ${intWithThousands},${decPart}`;
    }
}

// ============================================================================
// UTILIDADES DE LOGGING
// ============================================================================

/**
 * Log de error silencioso para operaciones no críticas
 */
export function logSilentError(context: string, error: unknown, metadata?: Record<string, unknown>): void {
    logger.error(`[Silent] ${context}`, {
        error: error instanceof Error ? error.message : String(error),
        ...metadata,
    });
}

// ============================================================================
// CLASIFICACIÓN DE PLANES
// ============================================================================

export type PlanRow = PlanPriceFields & {
    code: string;
    name: string | null;
    max_products: number | null;
    max_images_per_product: number | null;
    credits_monthly: number | null;
    can_feature?: boolean | null;
    feature_cost?: number | null;
};

export function isFreePlan(p: PlanRow): boolean {
    const code = (p.code || "").toLowerCase();
    const name = (p.name || "").toLowerCase();
    const { monthly } = computePrice(p);
    return (
        monthly === 0 ||
        code.includes("free") ||
        code.includes("basic") ||
        name.includes("básico") ||
        name.includes("basico")
    );
}

export function isDeluxePlan(p: PlanRow): boolean {
    const code = (p.code || "").toLowerCase();
    const name = (p.name || "").toLowerCase();
    return code.includes("deluxe") || name.includes("deluxe");
}

export function getPlanTier(p: PlanRow): "gratis" | "plus" | "deluxe" | "other" {
    const code = (p.code || "").toLowerCase();
    const name = (p.name || "").toLowerCase();
    if (isFreePlan(p) || code.includes("gratis")) return "gratis";
    if (isDeluxePlan(p)) return "deluxe";
    if (
        code.includes("plus") ||
        name.includes("plus") ||
        code.includes("enterprise") ||
        code.includes("premium") ||
        code.includes("pro")
    )
        return "plus";
    return "other";
}

/**
 * Ordena los planes: Gratis primero, Deluxe (destacado) después, resto en medio.
 */
export function sortPlans(plans: PlanRow[]): PlanRow[] {
    if (plans.length === 0) return [];
    const copy = [...plans];

    const idxFree = copy.findIndex(isFreePlan);
    const idxDeluxe = copy.findIndex(isDeluxePlan);

    if (idxFree !== -1 && idxDeluxe !== -1 && idxFree !== idxDeluxe) {
        const freePlan = copy[idxFree];
        const deluxePlan = copy[idxDeluxe];

        if (freePlan && deluxePlan) {
            copy[idxFree] = deluxePlan;
            copy[idxDeluxe] = freePlan;
        }
    }
    return copy;
}
