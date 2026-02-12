// GET /api/corporativo/orgaos/:id
// Busca dados de um órgão por ID via corporativo-proxy

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getCorporativoClient } from '@/lib/corporativo/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const seqOrgao = parseInt(id);
  if (isNaN(seqOrgao)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    const client = getCorporativoClient();
    const orgao = await client.getOrgao(seqOrgao);

    if (!orgao) {
      return NextResponse.json({ error: 'Órgão não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: orgao });
  } catch (error) {
    console.error('Erro ao buscar órgão:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
