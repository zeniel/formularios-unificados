// =============================================================================
// LOGGER ESTRUTURADO - Corporativo Proxy
// =============================================================================
//
// Zero dependencies. Structured JSON logs to stdout/stderr.
// Controlável via LOG_LEVEL env var: debug | info | warn | error (default: info)
//
// =============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): number {
  const env = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
  return LEVELS[env] ?? LEVELS.info;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, msg: string, meta?: Record<string, unknown>): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };
  return JSON.stringify(entry);
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= getMinLevel();
}

// =============================================================================
// PUBLIC API
// =============================================================================

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog('debug')) {
      console.debug(formatLog('debug', msg, meta));
    }
  },

  info(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog('info')) {
      console.info(formatLog('info', msg, meta));
    }
  },

  warn(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', msg, meta));
    }
  },

  error(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog('error')) {
      console.error(formatLog('error', msg, meta));
    }
  },
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Formats an Error into a serializable object for logging.
 * Handles mysql2 errors which carry .code, .errno, .sqlState, .sqlMessage.
 */
export function errorMeta(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const meta: Record<string, unknown> = {
      error: err.message || '(empty message)',
      stack: err.stack,
    };

    // mysql2 error fields
    const dbErr = err as Record<string, unknown>;
    if (dbErr.code) meta.code = dbErr.code;             // e.g. ECONNREFUSED, ER_ACCESS_DENIED_ERROR
    if (dbErr.errno) meta.errno = dbErr.errno;           // e.g. -111, 1045
    if (dbErr.sqlState) meta.sqlState = dbErr.sqlState;   // e.g. 28000
    if (dbErr.sqlMessage) meta.sqlMessage = dbErr.sqlMessage;
    if (err.cause) meta.cause = String(err.cause);

    return meta;
  }
  return { error: String(err) };
}

/**
 * Sanitizes a value for logging (hides passwords, tokens, etc.)
 */
export function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitive = ['password', 'senha', 'token', 'secret', 'credential', 'credencial'];
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      result[key] = '***';
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Creates a child logger with fixed context fields
 */
export function childLogger(context: Record<string, unknown>) {
  return {
    debug(msg: string, meta?: Record<string, unknown>) {
      logger.debug(msg, { ...context, ...meta });
    },
    info(msg: string, meta?: Record<string, unknown>) {
      logger.info(msg, { ...context, ...meta });
    },
    warn(msg: string, meta?: Record<string, unknown>) {
      logger.warn(msg, { ...context, ...meta });
    },
    error(msg: string, meta?: Record<string, unknown>) {
      logger.error(msg, { ...context, ...meta });
    },
  };
}
