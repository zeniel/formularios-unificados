// PUT /api/categorias/reordenar
// Atualiza a ordem das categorias de pergunta

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPerfil } from '@/lib/auth/session';
import { reordenarCategorias } from '@/lib/questionarios/repository';

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const podeEditar = await hasAnyPerfil(['ADMINISTRADOR', 'PESQUISADOR']);
  if (!podeEditar) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { ordens } = body;

    if (!Array.isArray(ordens) || ordens.length === 0) {
      return NextResponse.json(
        { error: 'Formato inválido: ordens deve ser um array' },
        { status: 400 }
      );
    }

    await reordenarCategorias(ordens);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/categorias/reordenar] Erro:', error);
    return NextResponse.json({ error: 'Erro ao reordenar categorias' }, { status: 500 });
  }
}
