// src/app/auth/sair/route.ts
import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';

export async function GET() {
  await destroySession();

  const corporativoUrl = process.env.NEXT_PUBLIC_CNJ_CORPORATIVO_URL;
  if (!corporativoUrl) {
    console.error('[auth/sair] NEXT_PUBLIC_CNJ_CORPORATIVO_URL não definida!');
    return NextResponse.json(
      { error: 'Configuração do sistema incompleta: NEXT_PUBLIC_CNJ_CORPORATIVO_URL não definida.' },
      { status: 500 }
    );
  }

  return NextResponse.redirect(corporativoUrl);
}
