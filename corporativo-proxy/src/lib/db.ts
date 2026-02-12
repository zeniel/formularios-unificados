// =============================================================================
// CONEXÃO COM O BANCO CORPORATIVO
// =============================================================================

import mysql from 'mysql2/promise';
import { logger, errorMeta, sanitize } from './logger';

// Pool de conexões
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    const host = process.env.CORPORATIVO_DB_HOST;
    const port = process.env.CORPORATIVO_DB_PORT;
    const user = process.env.CORPORATIVO_DB_USER;
    const password = process.env.CORPORATIVO_DB_PASSWORD;
    const database = process.env.CORPORATIVO_DB_NAME;

    if (!host || !user || !database) {
      logger.warn('Variáveis CORPORATIVO_DB_* não definidas — usando defaults (localhost/root/corporativo). Crie um .env.local com as credenciais corretas.', {
        CORPORATIVO_DB_HOST: host ?? '(não definida)',
        CORPORATIVO_DB_USER: user ?? '(não definida)',
        CORPORATIVO_DB_NAME: database ?? '(não definida)',
      });
    }

    const config = {
      host: host || 'localhost',
      port: parseInt(port || '3306'),
      user: user || 'root',
      password: password || '',
      database: database || 'corporativo',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };

    logger.info('Criando pool de conexões MySQL', {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      connectionLimit: config.connectionLimit,
    });

    pool = mysql.createPool(config);
  }
  return pool;
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const pool = getPool();
  const start = performance.now();

  try {
    const [rows] = await pool.execute(sql, params);
    const durationMs = Math.round(performance.now() - start);

    logger.debug('Query executada', {
      sql: sql.replace(/\s+/g, ' ').trim().substring(0, 200),
      params: params?.length ? `[${params.length} params]` : undefined,
      rows: Array.isArray(rows) ? rows.length : 0,
      durationMs,
    });

    return rows as T[];
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);

    logger.error('Erro na query', {
      sql: sql.replace(/\s+/g, ' ').trim().substring(0, 200),
      params: params?.length ? `[${params.length} params]` : undefined,
      durationMs,
      ...errorMeta(err),
    });

    throw err;
  }
}

export async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}
