// src/app/api/questionarios/[id]/perguntas/[perguntaId]/route.ts
// GET - Detalhe | PUT - Editar | DELETE - Excluir pergunta

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPerfil } from '@/lib/auth/session';
import {
  buscarPerguntaCompleta,
  editarPergunta,
  excluirPergunta,
} from '@/lib/questionarios/repository';

type Params = { params: Promise<{ id: string; perguntaId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { perguntaId } = await params;
    const pergunta = await buscarPerguntaCompleta(parseInt(perguntaId, 10));

    if (!pergunta) {
      return NextResponse.json({ error: 'Pergunta não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: pergunta });
  } catch (error) {
    console.error('[api/perguntas/[perguntaId]] Erro ao buscar:', error);
    return NextResponse.json({ error: 'Erro ao buscar pergunta' }, { status: 500 });
  }
}

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
    const { id, perguntaId } = await params;
    const body = await request.json();
    await editarPergunta(parseInt(id, 10), parseInt(perguntaId, 10), body);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao editar pergunta';
    const status = message.includes('não encontrad') ? 404
      : message.includes('RASCUNHO') || message.includes('não vinculada') ? 409
      : 500;
    console.error('[api/perguntas/[perguntaId]] Erro ao editar:', error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const podeExcluir = await hasAnyPerfil(['ADMINISTRADOR', 'PESQUISADOR']);
  if (!podeExcluir) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  try {
    const { id, perguntaId } = await params;
    await excluirPergunta(parseInt(id, 10), parseInt(perguntaId, 10));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir pergunta';
    const status = message.includes('não encontrad') ? 404
      : message.includes('RASCUNHO') ? 409
      : 500;
    console.error('[api/perguntas/[perguntaId]] Erro ao excluir:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
