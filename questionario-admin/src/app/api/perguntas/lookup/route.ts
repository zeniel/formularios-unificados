// src/app/api/perguntas/lookup/route.ts
// GET - Lookups: formatos, variáveis, periodicidades

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  listarFormatosResposta,
  listarVariaveisPergunta,
  listarPeriodicidades,
} from '@/lib/questionarios/repository';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const [formatos, variaveis, periodicidades] = await Promise.all([
      listarFormatosResposta(),
      listarVariaveisPergunta(),
      listarPeriodicidades(),
    ]);

    return NextResponse.json({
      success: true,
      data: { formatos, variaveis, periodicidades },
    });
  } catch (error) {
    console.error('[api/perguntas/lookup] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar lookups' }, { status: 500 });
  }
}
