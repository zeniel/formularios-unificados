// src/app/api/corporativo/contexto/route.ts
// API para obter o contexto completo do usuário

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getCorporativoClient } from '@/lib/corporativo/client';

export async function GET(request: NextRequest) {
  // Verificar autenticação
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // Parâmetros opcionais (para consultar outro usuário - só admin)
  const searchParams = request.nextUrl.searchParams;
  const seqUsuario = searchParams.get('usuario') 
    ? parseInt(searchParams.get('usuario')!, 10) 
    : session.usuario.seqUsuario;
  const seqOrgao = searchParams.get('orgao')
    ? parseInt(searchParams.get('orgao')!, 10)
    : session.usuario.seqOrgao;

  // Se está consultando outro usuário, verificar permissão
  if (seqUsuario !== session.usuario.seqUsuario) {
    const isAdmin = session.usuario.perfisAdmin?.includes('ADMINISTRADOR');
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Sem permissão para consultar outro usuário' }, 
        { status: 403 }
      );
    }
  }

  if (!seqOrgao) {
    return NextResponse.json(
      { error: 'Órgão não informado' }, 
      { status: 400 }
    );
  }

  try {
    const client = getCorporativoClient();
    const contexto = await client.getContextoUsuario(seqUsuario, seqOrgao);

    if (!contexto) {
      return NextResponse.json(
        { error: 'Contexto não encontrado' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: contexto,
    });
  } catch (error) {
    console.error('Erro ao buscar contexto:', error);
    return NextResponse.json(
      { error: 'Erro interno' }, 
      { status: 500 }
    );
  }
}
