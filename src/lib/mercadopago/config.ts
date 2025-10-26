/**
 * Configuración de Mercado Pago con soporte para dev/prod
 * Previene mezcla de tokens de test con producción
 */

import { logger } from "@/lib/logger";

export type MPEnvironment = "development" | "production";

/**
 * Detecta el ambiente actual
 */
export function getMPEnvironment(): MPEnvironment {
  // Vercel y otros providers setean NODE_ENV
  if (process.env.NODE_ENV === "production") {
    return "production";
  }
  return "development";
}

/**
 * Verifica si un access token es de test
 */
export function isMPTestToken(token: string): boolean {
  return token.startsWith("TEST-");
}

/**
 * Verifica si un access token es de producción
 */
export function isMPProductionToken(token: string): boolean {
  return token.startsWith("APP_USR-");
}

/**
 * Configuración validada de Mercado Pago
 */
interface MPConfig {
  accessToken: string;
  webhookSecret: string | null;
  environment: MPEnvironment;
  isTestToken: boolean;
  allowTests: boolean;
}

let cachedConfig: MPConfig | null = null;

/**
 * Obtiene y valida la configuración de Mercado Pago
 * Previene mezclas peligrosas de tokens test/prod
 */
export function getMPConfig(): MPConfig {
  if (cachedConfig) return cachedConfig;

  const accessToken = process.env.MP_ACCESS_TOKEN || "";
  const webhookSecret = process.env.MP_WEBHOOK_SECRET || null;
  const environment = getMPEnvironment();
  const isTestToken = isMPTestToken(accessToken);
  const allowTests = process.env.MP_WEBHOOK_ALLOW_TESTS === "true";

  // Validaciones de seguridad
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN no está configurado");
  }

  // CRÍTICO: Prevenir uso de token de producción en desarrollo
  if (environment === "development" && isMPProductionToken(accessToken)) {
    logger.warn(
      "ADVERTENCIA: Usando token de PRODUCCIÓN en ambiente de DESARROLLO. " +
      "Esto puede causar cargos reales. Usa un token TEST- en desarrollo."
    );
  }

  // CRÍTICO: Prevenir uso de token de test en producción
  if (environment === "production" && isTestToken) {
    throw new Error(
      "No se puede usar token de TEST (TEST-) en PRODUCCIÓN. " +
      "Configura MP_ACCESS_TOKEN con tu token de producción (APP_USR-)."
    );
  }

  cachedConfig = {
    accessToken,
    webhookSecret,
    environment,
    isTestToken,
    allowTests,
  };

  logger.info("Mercado Pago configurado", {
    environment,
    tokenType: isTestToken ? "TEST" : "PRODUCTION",
    webhookConfigured: !!webhookSecret,
  });

  return cachedConfig;
}

/**
 * Valida que un payer email sea compatible con el token
 * Previene error "Both payer and collector must be real or test users"
 */
export function validatePayerEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  const config = getMPConfig();
  const isTestEmail = email.includes("@testuser.com");

  // Token de test solo acepta emails de test
  if (config.isTestToken && !isTestEmail) {
    return {
      valid: false,
      error:
        "Token de TEST requiere email de usuario de prueba (ej: test_user_...@testuser.com). " +
        "Genera uno en https://www.mercadopago.com/developers/panel/app/credentials/test",
    };
  }

  // Token de producción solo acepta emails reales
  if (!config.isTestToken && isTestEmail) {
    return {
      valid: false,
      error:
        "Token de PRODUCCIÓN no acepta emails de test (@testuser.com). " +
        "Usa el email real del usuario.",
    };
  }

  return { valid: true };
}

/**
 * Obtiene la URL base de Mercado Pago según el ambiente
 */
export function getMPApiUrl(): string {
  const config = getMPConfig();
  // MP usa la misma URL para test y prod, el token determina el ambiente
  return "https://api.mercadopago.com";
}

/**
 * Headers comunes para requests a MP API
 */
export function getMPHeaders(): Record<string, string> {
  const config = getMPConfig();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.accessToken}`,
  };
}

/**
 * Limpia el caché de configuración (útil para testing)
 */
export function clearMPConfigCache(): void {
  cachedConfig = null;
}
