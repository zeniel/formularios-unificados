// src/app/api/corporativo/tribunais/route.ts
// API para listar tribunais

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getCorporativoClient } from '@/lib/corporativo/client';

export async function GET() {
  // Verificar autenticação
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const client = getCorporativoClient();
    const tribunais = await client.listarTribunais();

    return NextResponse.json({
      success: true,
      data: tribunais,
    });
  } catch (error) {
    console.error('Erro ao listar tribunais:', error);
    return NextResponse.json(
      { error: 'Erro interno' }, 
      { status: 500 }
    );
  }
}
