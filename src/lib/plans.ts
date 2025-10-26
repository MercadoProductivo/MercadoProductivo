/**
 * Utilidades para normalización y manejo de planes
 * Mapea inconsistencias entre códigos de BD y frontend
 */

export type PlanCode = "free" | "plus" | "deluxe";

/**
 * Códigos canónicos de planes (para usar en toda la app)
 */
export const PLAN_CODES = {
  FREE: "free" as const,
  PLUS: "plus" as const,
  DELUXE: "deluxe" as const,
} as const;

/**
 * Mapeo de códigos legacy o inconsistentes a códigos canónicos
 */
const PLAN_ALIASES: Record<string, PlanCode> = {
  // Códigos canónicos
  free: "free",
  plus: "plus",
  deluxe: "deluxe",
  
  // Aliases comunes en BD
  gratis: "free",
  basico: "free",
  basic: "free",
  
  premium: "plus",
  pro: "plus",
  
  // Enterprise/Deluxe
  enterprise: "deluxe",
  delux: "deluxe",
};

/**
 * Normaliza cualquier código de plan a su forma canónica
 * @param code Código de plan desde BD o user_metadata
 * @returns Código normalizado o "free" como fallback
 */
export function normalizePlanCode(code: string | null | undefined): PlanCode {
  if (!code) return PLAN_CODES.FREE;
  
  const normalized = String(code).toLowerCase().trim();
  return PLAN_ALIASES[normalized] || PLAN_CODES.FREE;
}

/**
 * Labels amigables para mostrar en UI
 */
export const PLAN_LABELS: Record<PlanCode, string> = {
  free: "Gratis",
  plus: "Plus",
  deluxe: "Deluxe",
};

/**
 * Obtiene el label display de un plan
 */
export function getPlanLabel(code: string | null | undefined): string {
  const normalized = normalizePlanCode(code);
  return PLAN_LABELS[normalized];
}

/**
 * Límites por defecto según plan (fallback si BD no responde)
 */
export const DEFAULT_PLAN_LIMITS = {
  free: {
    max_products: 3,
    max_services: 3,
    max_images_per_product: 1,
    max_images_per_service: 1,
    can_feature: false,
    credits_per_month: 0,
  },
  plus: {
    max_products: 20,
    max_services: 20,
    max_images_per_product: 5,
    max_images_per_service: 5,
    can_feature: true,
    credits_per_month: 50,
  },
  deluxe: {
    max_products: -1, // ilimitado
    max_services: -1,
    max_images_per_product: 10,
    max_images_per_service: 10,
    can_feature: true,
    credits_per_month: 200,
  },
} as const;

/**
 * Obtiene los límites de un plan (normalizado)
 */
export function getPlanLimits(code: string | null | undefined) {
  const normalized = normalizePlanCode(code);
  return DEFAULT_PLAN_LIMITS[normalized];
}

/**
 * Verifica si un plan permite destacar productos/servicios
 */
export function canFeatureContent(code: string | null | undefined): boolean {
  return getPlanLimits(code).can_feature;
}

/**
 * Verifica si el usuario alcanzó el límite de productos
 */
export function isAtProductLimit(
  currentCount: number,
  planCode: string | null | undefined
): boolean {
  const limits = getPlanLimits(planCode);
  if (limits.max_products === -1) return false; // ilimitado
  return currentCount >= limits.max_products;
}

/**
 * Verifica si el usuario alcanzó el límite de servicios
 */
export function isAtServiceLimit(
  currentCount: number,
  planCode: string | null | undefined
): boolean {
  const limits = getPlanLimits(planCode);
  if (limits.max_services === -1) return false; // ilimitado
  return currentCount >= limits.max_services;
}
