// src/app/api/questionarios/[id]/perguntas/route.ts
// POST - Criar pergunta no formulário

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPerfil } from '@/lib/auth/session';
import { criarPergunta } from '@/lib/questionarios/repository';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const podeCriar = await hasAnyPerfil(['ADMINISTRADOR', 'PESQUISADOR']);
  if (!podeCriar) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.DSC_PERGUNTA || !body.SEQ_TIPO_FORMATO_RESPOSTA) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: DSC_PERGUNTA, SEQ_TIPO_FORMATO_RESPOSTA' },
        { status: 400 }
      );
    }

    const seqPergunta = await criarPergunta(
      { ...body, SEQ_QUESTIONARIO: parseInt(id, 10) },
      session.usuario.nomUsuario
    );

    return NextResponse.json({ success: true, data: { SEQ_PERGUNTA: seqPergunta } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar pergunta';
    const status = message.includes('não encontrado') ? 404
      : message.includes('RASCUNHO') ? 409
      : 500;
    console.error('[api/questionarios/[id]/perguntas] Erro ao criar:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
