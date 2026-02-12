// src/app/api/questionarios/[id]/publicar/route.ts
// POST - Publica questionário (RASCUNHO → PUBLICADO + cascata perguntas)

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPerfil } from '@/lib/auth/session';
import { publicarQuestionario } from '@/lib/questionarios/repository';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const podePublicar = await hasAnyPerfil(['ADMINISTRADOR', 'PESQUISADOR']);
  if (!podePublicar) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  try {
    const { id } = await params;
    await publicarQuestionario(parseInt(id, 10), session.usuario.nomUsuario);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao publicar questionário';
    const status = message.includes('não encontrado') ? 404
      : message.includes('RASCUNHO') ? 409
      : 500;
    console.error('[api/questionarios/[id]/publicar] Erro:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
