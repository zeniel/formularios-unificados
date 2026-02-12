// =============================================================================
// MIDDLEWARE - Request/Response logging
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { method, nextUrl } = request;
  const path = nextUrl.pathname;
  const query = nextUrl.search || undefined;

  // Log incoming request
  logger.info('→ Request', {
    method,
    path,
    query,
    userAgent: request.headers.get('user-agent')?.substring(0, 100),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
  });

  // Continue with the request
  const response = NextResponse.next();

  // Log response timing via header (Next.js middleware can't await the response body)
  const durationMs = Date.now() - start;
  response.headers.set('X-Response-Time', `${durationMs}ms`);

  logger.info('← Response', {
    method,
    path,
    durationMs,
  });

  return response;
}

export const config = {
  // Only run on API routes
  matcher: '/api/:path*',
};
