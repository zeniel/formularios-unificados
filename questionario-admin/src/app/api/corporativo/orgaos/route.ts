// GET /api/corporativo/orgaos?tribunal={sigla}&busca={nome}
// Busca órgãos de um tribunal (por sigla) via corporativo-proxy

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getCorporativoClient } from '@/lib/corporativo/client';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const siglaTribunal = searchParams.get('tribunal');
  const busca = searchParams.get('busca') || undefined;

  if (!siglaTribunal?.trim()) {
    return NextResponse.json(
      { error: 'Parâmetro tribunal (sigla) é obrigatório' },
      { status: 400 }
    );
  }

  try {
    const client = getCorporativoClient();
    const orgaos = await client.buscarOrgaos(siglaTribunal.trim(), busca);

    return NextResponse.json({
      success: true,
      data: orgaos,
    });
  } catch (error) {
    console.error('Erro ao buscar órgãos:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
