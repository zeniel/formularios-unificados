// src/lib/auth/session.ts
// Gerenciamento de sessão via cookies

import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'qadmin_session';
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 horas

// Perfis do sistema - mapeados a partir do perfil corporativo
// O perfil corporativo determina o que o usuário pode fazer no sistema admin
export type PerfilSistema = 'ADMINISTRADOR' | 'VISUALIZADOR' | 'PESQUISADOR' | 'PESQUISADO';

// Dados do usuário na sessão
export interface UsuarioSessao {
  seqUsuario: number;
  nomUsuario: string;
  numCpf?: string;
  seqOrgao?: number;
  dscOrgao?: string;
  siglaOrgao?: string;
  ufOrgao?: string;
  // Perfil vindo do corporativo
  seqPerfilCorporativo?: number;
  nomPerfilCorporativo?: string;
  // Perfis mapeados para o sistema admin (derivados do perfil corporativo)
  perfisAdmin: PerfilSistema[];
}

// Dados completos da sessão
export interface SessionData {
  usuario: UsuarioSessao;
  token: string; // CSRF token
  createdAt: number;
  expiresAt: number;
}

/**
 * Cria uma nova sessão
 */
export async function createSession(usuario: UsuarioSessao): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();

  const sessionData: SessionData = {
    usuario,
    token,
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE * 1000,
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  return token;
}

/**
 * Obtém a sessão atual
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const session = JSON.parse(sessionCookie.value) as SessionData;

    // Verificar expiração
    if (Date.now() > session.expiresAt) {
      await destroySession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Obtém o usuário da sessão atual
 */
export async function getUsuario(): Promise<UsuarioSessao | null> {
  const session = await getSession();
  return session?.usuario ?? null;
}

/**
 * Verifica se o usuário tem um perfil específico
 */
export async function hasPerfilAdmin(perfil: PerfilSistema): Promise<boolean> {
  const usuario = await getUsuario();
  return usuario?.perfisAdmin?.includes(perfil) ?? false;
}

/**
 * Verifica se o usuário tem algum dos perfis especificados
 */
export async function hasAnyPerfilAdmin(perfis: PerfilSistema[]): Promise<boolean> {
  const usuario = await getUsuario();
  if (!usuario?.perfisAdmin) return false;
  return perfis.some(p => usuario.perfisAdmin.includes(p));
}

/**
 * Valida o token CSRF
 */
export async function validateToken(token: string): Promise<boolean> {
  const session = await getSession();
  return session?.token === token;
}

/**
 * Destrói a sessão atual
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Helper para uso em Server Components
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    throw new Error('Não autenticado');
  }
  return session;
}

/**
 * Helper para verificar permissão em Server Components
 */
export async function requirePerfil(perfis: PerfilSistema[]): Promise<SessionData> {
  const session = await requireAuth();
  const hasPerfil = perfis.some(p => session.usuario.perfisAdmin?.includes(p));
  if (!hasPerfil) {
    throw new Error('Sem permissão');
  }
  return session;
}
