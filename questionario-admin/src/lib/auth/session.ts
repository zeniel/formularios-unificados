// src/lib/auth/session.ts
// Gerenciamento de sessão via cookies

import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'qadmin_session';
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 horas

// Dados do usuário na sessão
export interface UsuarioSessao {
  seqUsuario: number;
  nomUsuario: string;
  numCpf?: string;
  seqOrgao?: number;
  dscOrgao?: string;
  siglaOrgao?: string;
  ufOrgao?: string;
  // Perfil vindo diretamente do corporativo (ex: ADMINISTRADOR)
  seqPerfil?: number;
  nomPerfil?: string;
}

// Dados completos da sessão
export interface SessionData {
  usuario: UsuarioSessao;
  token: string; // CSRF token
  createdAt: number;
  expiresAt: number;
}

/**
 * Monta os dados da sessão (sem setar cookie).
 * Use setSessionCookie() para gravar no response.
 */
export function buildSessionData(usuario: UsuarioSessao): SessionData {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();

  return {
    usuario,
    token,
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE * 1000,
  };
}

/**
 * Grava o cookie de sessão diretamente em um NextResponse.
 * Isso garante que o Set-Cookie seja incluído mesmo em redirects.
 */
export function setSessionCookie(
  response: import('next/server').NextResponse,
  sessionData: SessionData
): void {
  response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Cria uma nova sessão (via cookies() do next/headers).
 * Funciona em Server Components e Route Handlers que NÃO retornam NextResponse customizado.
 */
export async function createSession(usuario: UsuarioSessao): Promise<string> {
  const sessionData = buildSessionData(usuario);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  return sessionData.token;
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
 * Verifica se o usuário tem o perfil especificado (comparação case-insensitive)
 */
export async function hasPerfil(perfil: string): Promise<boolean> {
  const usuario = await getUsuario();
  return usuario?.nomPerfil?.toUpperCase() === perfil.toUpperCase();
}

/**
 * Verifica se o usuário tem algum dos perfis especificados
 */
export async function hasAnyPerfil(perfis: string[]): Promise<boolean> {
  const usuario = await getUsuario();
  if (!usuario?.nomPerfil) return false;
  const upper = usuario.nomPerfil.toUpperCase();
  return perfis.some(p => p.toUpperCase() === upper);
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
export async function requirePerfil(perfis: string[]): Promise<SessionData> {
  const session = await requireAuth();
  const upper = session.usuario.nomPerfil?.toUpperCase() ?? '';
  const temPerfil = perfis.some(p => p.toUpperCase() === upper);
  if (!temPerfil) {
    throw new Error('Sem permissão');
  }
  return session;
}
