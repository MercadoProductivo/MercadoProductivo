/**
 * Sistema de rate limiting con soporte para Redis/Vercel KV
 * Fallback automático a memoria en desarrollo
 */

import { logger } from "./logger";

export interface RateLimitConfig {
  /**
   * Número máximo de requests permitidos en la ventana
   */
  maxRequests: number;
  /**
   * Ventana de tiempo en segundos
   */
  windowSeconds: number;
  /**
   * Identificador único (puede ser IP, userId, etc.)
   */
  identifier: string;
  /**
   * Namespace para evitar colisiones (ej: "api:chat", "api:contact")
   */
  namespace?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

// =============================================================================
// IMPLEMENTACIÓN CON VERCEL KV (Redis)
// =============================================================================

let kvClient: any = null;
let kvInitialized = false;

/**
 * Inicializa el cliente de Vercel KV
 */
async function getKVClient() {
  if (kvInitialized) return kvClient;

  try {
    // Solo intentar en entornos con las variables configuradas
    if (
      process.env.KV_REST_API_URL &&
      process.env.KV_REST_API_TOKEN
    ) {
      // Importación dinámica para evitar errores si no está instalado
      const kvModule = await import("@vercel/kv").catch(() => null);
      if (kvModule) {
        kvClient = kvModule.kv;
        logger.info("Rate limiting: Vercel KV initialized");
      } else {
        logger.warn("Rate limiting: @vercel/kv package not installed, using memory fallback");
      }
    }
  } catch (error) {
    logger.warn("Rate limiting: Vercel KV not available, using memory fallback", {
      error: String(error),
    });
    kvClient = null;
  }

  kvInitialized = true;
  return kvClient;
}

/**
 * Rate limiting usando Vercel KV (Redis)
 */
async function checkRateLimitKV(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const kv = await getKVClient();
  if (!kv) {
    // Fallback a memoria
    return checkRateLimitMemory(config);
  }

  const { maxRequests, windowSeconds, identifier, namespace = "ratelimit" } = config;
  const key = `${namespace}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  try {
    // Obtener contador actual
    const data = (await kv.get(key)) as { count: number; resetAt: number } | null;

    // Nueva ventana
    if (!data || data.resetAt < now) {
      const resetAt = now + windowMs;
      await kv.set(key, { count: 1, resetAt }, { px: windowMs });
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        resetAt,
      };
    }

    // Límite excedido
    if (data.count >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        resetAt: data.resetAt,
      };
    }

    // Incrementar contador
    const newCount = data.count + 1;
    const ttl = data.resetAt - now;
    await kv.set(key, { count: newCount, resetAt: data.resetAt }, { px: ttl });

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - newCount,
      resetAt: data.resetAt,
    };
  } catch (error) {
    logger.error("Rate limiting: KV operation failed, using memory fallback", {
      error: String(error),
      identifier,
    });
    return checkRateLimitMemory(config);
  }
}

// =============================================================================
// IMPLEMENTACIÓN EN MEMORIA (Fallback)
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Limpieza periódica cada 5 minutos
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const entries = Array.from(memoryStore.entries());
    for (const [key, entry] of entries) {
      if (entry.resetAt < now) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Rate limiting usando memoria (fallback)
 */
function checkRateLimitMemory(config: RateLimitConfig): RateLimitResult {
  const { maxRequests, windowSeconds, identifier, namespace = "ratelimit" } = config;
  const key = `${namespace}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const entry = memoryStore.get(key);

  // Nueva ventana
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetAt,
    };
  }

  // Dentro de ventana existente
  if (entry.count >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Incrementar contador
  entry.count += 1;
  memoryStore.set(key, entry);

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// =============================================================================
// API PÚBLICA
// =============================================================================

/**
 * Verifica si una request está dentro del límite de rate limiting
 * Usa Redis/Vercel KV si está disponible, fallback a memoria
 */
export async function checkRateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return checkRateLimitKV(config);
}

/**
 * Extrae IP del request (considerando proxies)
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;

  // Fallback (no ideal pero funcional en desarrollo)
  return "unknown";
}

/**
 * Helper para aplicar rate limiting a un endpoint
 * Retorna Response de error si se excede el límite
 */
export async function rateLimitMiddleware(
  req: Request,
  config: Omit<RateLimitConfig, "identifier"> & { identifier?: string }
): Promise<RateLimitResult | Response> {
  const identifier = config.identifier || getClientIP(req);
  const result = await checkRateLimit({
    ...config,
    identifier,
  });

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: "RATE_LIMIT_EXCEEDED",
        message: "Demasiadas solicitudes. Por favor intenta más tarde.",
        resetAt: new Date(result.resetAt).toISOString(),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  return result;
}

/**
 * Limpia el rate limit para un identificador (útil para testing)
 */
export async function clearRateLimit(identifier: string, namespace = "ratelimit"): Promise<void> {
  const key = `${namespace}:${identifier}`;
  
  const kv = await getKVClient();
  if (kv) {
    try {
      await kv.del(key);
    } catch (error) {
      logger.error("Failed to clear rate limit in KV", { error: String(error), key });
    }
  }
  
  memoryStore.delete(key);
}
