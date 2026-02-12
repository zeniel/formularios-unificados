// src/app/auth/sair/route.ts
import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';

const CORPORATIVO_URL = process.env.NEXT_PUBLIC_CNJ_CORPORATIVO_URL || 'https://www.cnj.jus.br/corporativo';

export async function GET() {
  await destroySession();
  return NextResponse.redirect(CORPORATIVO_URL);
}
