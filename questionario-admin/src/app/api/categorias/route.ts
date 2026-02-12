// src/app/api/categorias/route.ts
// POST - Criar nova categoria

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPerfil } from '@/lib/auth/session';
import { criarCategoria } from '@/lib/questionarios/repository';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const podeCriar = await hasAnyPerfil(['ADMINISTRADOR', 'PESQUISADOR']);
  if (!podeCriar) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (!body.DSC_CATEGORIA_PERGUNTA?.trim()) {
      return NextResponse.json(
        { error: 'O nome da categoria é obrigatório' },
        { status: 400 }
      );
    }

    const id = await criarCategoria(body, session.usuario.nomUsuario);
    return NextResponse.json({ success: true, data: { SEQ_CATEGORIA_PERGUNTA: id } }, { status: 201 });
  } catch (error) {
    console.error('[api/categorias] Erro ao criar:', error);
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  }
}
