// src/app/api/questionarios/[id]/perguntas/reordenar/route.ts
// PUT - Reordenar perguntas (drag-and-drop)

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPerfil } from '@/lib/auth/session';
import { reordenarPerguntas } from '@/lib/questionarios/repository';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const podeEditar = await hasAnyPerfil(['ADMINISTRADOR', 'PESQUISADOR']);
  if (!podeEditar) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (!Array.isArray(body.ordens) || body.ordens.length === 0) {
      return NextResponse.json(
        { error: 'Campo obrigatório: ordens (array de {SEQ_PERGUNTA, NUM_ORDEM, SEQ_CATEGORIA_PERGUNTA})' },
        { status: 400 }
      );
    }

    await reordenarPerguntas(parseInt(id, 10), body.ordens);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao reordenar';
    const status = message.includes('não encontrado') ? 404
      : message.includes('RASCUNHO') ? 409
      : 500;
    console.error('[api/perguntas/reordenar] Erro:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
