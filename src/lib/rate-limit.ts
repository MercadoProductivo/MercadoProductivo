/**
 * Sistema simple de rate limiting basado en memoria
 * Para producción considerar Redis u otra solución distribuida
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpieza periódica cada 5 minutos
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(store.entries());
  for (const [key, entry] of entries) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

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
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Verifica si una request está dentro del límite de rate limiting
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const { maxRequests, windowSeconds, identifier } = config;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const entry = store.get(identifier);

  // Nueva ventana
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(identifier, { count: 1, resetAt });
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
  store.set(identifier, entry);

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
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
export function rateLimitMiddleware(
  req: Request,
  config: Omit<RateLimitConfig, "identifier"> & { identifier?: string }
): RateLimitResult | Response {
  const identifier = config.identifier || getClientIP(req);
  const result = checkRateLimit({
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
