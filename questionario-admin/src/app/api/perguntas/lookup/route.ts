// src/app/api/perguntas/lookup/route.ts
// GET - Lookups: formatos de resposta

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listarFormatosResposta } from '@/lib/questionarios/repository';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const formatos = await listarFormatosResposta();

    return NextResponse.json({
      success: true,
      data: { formatos },
    });
  } catch (error) {
    console.error('[api/perguntas/lookup] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar lookups' }, { status: 500 });
  }
}
