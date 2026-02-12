// =============================================================================
// CONEXÃO COM O BANCO CORPORATIVO
// =============================================================================

import mysql from 'mysql2/promise';

// Pool de conexões
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.CORPORATIVO_DB_HOST || 'localhost',
      port: parseInt(process.env.CORPORATIVO_DB_PORT || '3306'),
      user: process.env.CORPORATIVO_DB_USER || 'root',
      password: process.env.CORPORATIVO_DB_PASSWORD || '',
      database: process.env.CORPORATIVO_DB_NAME || 'corporativo',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}
