// src/app/api/dashboard/stats/route.ts
// Retorna contadores do dashboard de forma eficiente (COUNT)

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    // Executar contagens em paralelo para performance
    const [formularios, perguntas, respostas] = await Promise.all([
      prisma.questionario.count(),
      prisma.pergunta.count(),
      prisma.resposta.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: { formularios, perguntas, respostas },
    });
  } catch (error) {
    console.error('[api/dashboard/stats] Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
