// src/app/api/questionarios/[id]/nova-versao/route.ts
// POST - Cria nova versão RASCUNHO a partir de PUBLICADO

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPerfil } from '@/lib/auth/session';
import { criarNovaVersao } from '@/lib/questionarios/repository';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
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
    const novoId = await criarNovaVersao(parseInt(id, 10), session.usuario.nomUsuario);
    return NextResponse.json({ success: true, data: { SEQ_QUESTIONARIO: novoId } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar nova versão';
    const status = message.includes('não encontrado') ? 404
      : message.includes('PUBLICADOS') ? 409
      : message.includes('RASCUNHO') ? 409
      : 500;
    console.error('[api/questionarios/[id]/nova-versao] Erro:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
