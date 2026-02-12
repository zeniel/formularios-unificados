// src/middleware.ts
// Middleware de proteção de rotas

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

function redirectToCorporativo(request: NextRequest, motivo: string) {
  const corporativoUrl = process.env.NEXT_PUBLIC_CNJ_CORPORATIVO_URL;
  const { pathname } = request.nextUrl;

  if (!corporativoUrl) {
    console.error(`[middleware] NEXT_PUBLIC_CNJ_CORPORATIVO_URL não definida! Não é possível redirecionar. Motivo: ${motivo}`);
    return NextResponse.json(
      { error: 'Configuração do sistema incompleta: NEXT_PUBLIC_CNJ_CORPORATIVO_URL não definida.' },
      { status: 500 }
    );
  }

  console.log(`[middleware] ${request.method} ${pathname} → ${motivo}, redirecionando para: ${corporativoUrl}`);
  return NextResponse.redirect(corporativoUrl);
}

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
    return redirectToCorporativo(request, 'sem cookie de sessão');
  }

  try {
    const session = JSON.parse(sessionCookie);

    // Verificar se tem dados mínimos
    if (!session.usuario || !session.token) {
      return redirectToCorporativo(request, 'sessão inválida (sem usuario/token)');
    }

    // Verificar expiração
    if (Date.now() > session.expiresAt) {
      const response = redirectToCorporativo(request, 'sessão expirada');
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    // Sessão válida - continuar
    return NextResponse.next();
  } catch {
    const response = redirectToCorporativo(request, 'cookie inválido (parse error)');
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!api/health|_next/static|_next/image|favicon.ico).*)',
  ],
};
