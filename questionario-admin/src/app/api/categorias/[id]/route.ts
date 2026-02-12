// src/app/api/categorias/[id]/route.ts
// PUT - Editar texto da categoria

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPerfil } from '@/lib/auth/session';
import { editarCategoria } from '@/lib/questionarios/repository';

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

    if (!body.DSC_CATEGORIA_PERGUNTA?.trim()) {
      return NextResponse.json(
        { error: 'O nome da categoria é obrigatório' },
        { status: 400 }
      );
    }

    await editarCategoria(parseInt(id, 10), body.DSC_CATEGORIA_PERGUNTA);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao editar categoria';
    const status = message.includes('não encontrada') ? 404 : 500;
    console.error('[api/categorias/[id]] Erro ao editar:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
