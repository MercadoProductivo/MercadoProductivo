/**
 * Logger centralizado para la aplicación
 * Controla niveles de logging por ambiente y proporciona contexto estructurado
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Obtiene el nivel de log actual desde ENV o default 'info'
 */
function getCurrentLevel(): LogLevel {
  if (typeof window === 'undefined') {
    // Server-side
    const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
    return (level in LOG_LEVELS ? level : 'info') as LogLevel;
  }
  // Client-side
  const level = (process.env.NEXT_PUBLIC_LOG_LEVEL || 'warn').toLowerCase();
  return (level in LOG_LEVELS ? level : 'warn') as LogLevel;
}

/**
 * Verifica si un nivel debe ser loggeado
 */
function shouldLog(level: LogLevel): boolean {
  const current = getCurrentLevel();
  return LOG_LEVELS[level] <= LOG_LEVELS[current];
}

/**
 * Formatea el mensaje con timestamp y contexto
 */
function formatMessage(level: LogLevel, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (meta && Object.keys(meta).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(meta)}`;
  }
  
  return `${prefix} ${message}`;
}

/**
 * Logger principal
 */
export const logger = {
  /**
   * Log de errores críticos
   */
  error(message: string, meta?: any): void {
    if (!shouldLog('error')) return;
    
    const formatted = formatMessage('error', message, meta);
    console.error(formatted);
    
    // En producción, aquí podrías enviar a un servicio de monitoring
    // ej: Sentry, LogRocket, etc.
  },

  /**
   * Log de warnings (situaciones anormales pero manejables)
   */
  warn(message: string, meta?: any): void {
    if (!shouldLog('warn')) return;
    
    const formatted = formatMessage('warn', message, meta);
    console.warn(formatted);
  },

  /**
   * Log de información general (flujos importantes)
   */
  info(message: string, meta?: any): void {
    if (!shouldLog('info')) return;
    
    const formatted = formatMessage('info', message, meta);
    console.log(formatted);
  },

  /**
   * Log de debugging (solo desarrollo)
   */
  debug(message: string, meta?: any): void {
    if (!shouldLog('debug')) return;
    
    const formatted = formatMessage('debug', message, meta);
    console.log(formatted);
  },

  /**
   * Log específico para performance
   */
  perf(label: string, durationMs: number, meta?: any): void {
    if (!shouldLog('info')) return;
    
    const message = `Performance: ${label} took ${durationMs.toFixed(2)}ms`;
    this.info(message, meta);
  },
};

/**
 * Helper para medir performance de funciones
 */
export function measurePerf<T>(
  label: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.then((res) => {
      const duration = performance.now() - start;
      logger.perf(label, duration);
      return res;
    }).catch((err) => {
      const duration = performance.now() - start;
      logger.perf(label, duration, { error: String(err) });
      throw err;
    });
  }
  
  const duration = performance.now() - start;
  logger.perf(label, duration);
  return result;
}

/**
 * Logger específico para debugging de Pusher
 */
export const pusherLogger = {
  connection(event: string, meta?: any): void {
    logger.debug(`Pusher: ${event}`, meta);
  },
  
  subscription(channel: string, event: string, meta?: any): void {
    logger.debug(`Pusher [${channel}]: ${event}`, meta);
  },
  
  message(channel: string, eventType: string, data?: any): void {
    logger.debug(`Pusher [${channel}] received ${eventType}`, { 
      preview: data ? JSON.stringify(data).substring(0, 100) : undefined 
    });
  },
};

/**
 * Logger específico para debugging de Chat
 */
export const chatLogger = {
  sent(conversationId: string, messageLength: number): void {
    logger.debug(`Chat: Message sent`, { conversationId, messageLength });
  },
  
  received(conversationId: string, senderId: string): void {
    logger.debug(`Chat: Message received`, { conversationId, senderId });
  },
  
  error(operation: string, error: any, meta?: any): void {
    logger.error(`Chat Error: ${operation}`, { error: String(error), ...meta });
  },
};
