// src/app/api/questionarios/route.ts
// GET - Lista questionários | POST - Cria questionário

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPerfil } from '@/lib/auth/session';
import { listarQuestionarios, criarQuestionario } from '@/lib/questionarios/repository';
import type { StatusPublicacao } from '@/lib/types/questionario';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const busca = searchParams.get('busca') || undefined;
    const status = searchParams.get('status') as StatusPublicacao | null;
    const tipo = searchParams.get('tipo') as 'periodico' | 'sob-demanda' | null;
    const pagina = parseInt(searchParams.get('pagina') || '1', 10);
    const porPagina = parseInt(searchParams.get('porPagina') || '20', 10);

    const resultado = await listarQuestionarios({
      busca,
      status: status || undefined,
      tipo: tipo || undefined,
      pagina,
      porPagina,
    });

    return NextResponse.json({ success: true, data: resultado });
  } catch (error) {
    console.error('[api/questionarios] Erro ao listar:', error);
    return NextResponse.json(
      { error: 'Erro ao listar questionários' },
      { status: 500 }
    );
  }
}

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

    // Sob demanda: SEQ_TIPO_PERIODICIDADE_PERGUNTA é null
    const isSobDemanda = !body.SEQ_TIPO_PERIODICIDADE_PERGUNTA;
    if (!body.NOM_QUESTIONARIO || !body.DSC_QUESTIONARIO) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: NOM_QUESTIONARIO, DSC_QUESTIONARIO' },
        { status: 400 }
      );
    }
    if (!isSobDemanda && !body.SEQ_TIPO_PERIODICIDADE_PERGUNTA) {
      return NextResponse.json(
        { error: 'Campo obrigatório para periódicos: SEQ_TIPO_PERIODICIDADE_PERGUNTA' },
        { status: 400 }
      );
    }

    const id = await criarQuestionario(body, session.usuario.nomUsuario);

    return NextResponse.json({ success: true, data: { SEQ_QUESTIONARIO: id } }, { status: 201 });
  } catch (error) {
    console.error('[api/questionarios] Erro ao criar:', error);
    return NextResponse.json(
      { error: 'Erro ao criar questionário' },
      { status: 500 }
    );
  }
}
