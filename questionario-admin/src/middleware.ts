// src/middleware.ts
// Middleware de proteção de rotas

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CORPORATIVO_URL = process.env.NEXT_PUBLIC_CNJ_CORPORATIVO_URL || 'https://www.cnj.jus.br/corporativo';
const SESSION_COOKIE_NAME = 'qadmin_session';

// Rotas públicas (não requerem autenticação)
const PUBLIC_ROUTES = [
  '/auth/callback',
  '/auth/erro',
  '/auth/sair',
  '/api/health',
];

// Rotas que iniciam com esses prefixos são públicas
const PUBLIC_PREFIXES = [
  '/_next',
  '/favicon.ico',
  '/static',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar se é rota pública
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isPublicPrefix = PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));

  if (isPublicRoute || isPublicPrefix) {
    return NextResponse.next();
  }

  // Verificar sessão
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    // Sem sessão - redirecionar para corporativo
    return NextResponse.redirect(CORPORATIVO_URL);
  }

  try {
    const session = JSON.parse(sessionCookie);

    // Verificar se tem dados mínimos
    if (!session.usuario || !session.token) {
      return NextResponse.redirect(CORPORATIVO_URL);
    }

    // Verificar expiração
    if (Date.now() > session.expiresAt) {
      // Sessão expirada - limpar cookie e redirecionar
      const response = NextResponse.redirect(CORPORATIVO_URL);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    // Sessão válida - continuar
    return NextResponse.next();
  } catch {
    // Cookie inválido
    const response = NextResponse.redirect(CORPORATIVO_URL);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/health (health check)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/health|_next/static|_next/image|favicon.ico).*)',
  ],
};
