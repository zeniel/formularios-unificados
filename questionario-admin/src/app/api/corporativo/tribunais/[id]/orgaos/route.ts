// src/app/api/corporativo/tribunais/[id]/orgaos/route.ts
// API para listar órgãos de um tribunal

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getCorporativoClient } from '@/lib/corporativo/client';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  // Verificar autenticação
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const tribunalId = parseInt(params.id, 10);
  if (isNaN(tribunalId)) {
    return NextResponse.json(
      { error: 'ID do tribunal inválido' }, 
      { status: 400 }
    );
  }

  try {
    const client = getCorporativoClient();
    const orgaos = await client.listarOrgaosTribunal(tribunalId);

    return NextResponse.json({
      success: true,
      data: orgaos,
    });
  } catch (error) {
    console.error('Erro ao listar órgãos:', error);
    return NextResponse.json(
      { error: 'Erro interno' }, 
      { status: 500 }
    );
  }
}
