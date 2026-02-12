// src/app/api/questionarios/lookup/route.ts
// GET - Retorna periodicidades e escopos para popular selects

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listarPeriodicidades, listarEscopos } from '@/lib/questionarios/repository';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const [periodicidades, escopos] = await Promise.all([
      listarPeriodicidades(),
      listarEscopos(),
    ]);

    return NextResponse.json({
      success: true,
      data: { periodicidades, escopos },
    });
  } catch (error) {
    console.error('[api/questionarios/lookup] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados de referência' },
      { status: 500 }
    );
  }
}
