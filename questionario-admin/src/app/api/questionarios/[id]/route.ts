// src/app/api/questionarios/[id]/route.ts
// GET - Detalhe | PUT - Editar | DELETE - Excluir

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPerfil } from '@/lib/auth/session';
import {
  buscarQuestionario,
  editarQuestionario,
  excluirQuestionario,
} from '@/lib/questionarios/repository';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const questionario = await buscarQuestionario(parseInt(id, 10));

    if (!questionario) {
      return NextResponse.json({ error: 'Questionário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: questionario });
  } catch (error) {
    console.error('[api/questionarios/[id]] Erro ao buscar:', error);
    return NextResponse.json({ error: 'Erro ao buscar questionário' }, { status: 500 });
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
    const { id } = await params;
    const body = await request.json();
    await editarQuestionario(parseInt(id, 10), body);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao editar questionário';
    const status = message.includes('não encontrado') ? 404
      : message.includes('RASCUNHO') ? 409
      : 500;
    console.error('[api/questionarios/[id]] Erro ao editar:', error);
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
    const { id } = await params;
    await excluirQuestionario(parseInt(id, 10));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir questionário';
    const status = message.includes('não encontrado') ? 404
      : message.includes('RASCUNHO') || message.includes('respostas') ? 409
      : 500;
    console.error('[api/questionarios/[id]] Erro ao excluir:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
