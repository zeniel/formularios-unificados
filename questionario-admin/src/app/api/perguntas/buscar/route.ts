// src/app/api/perguntas/buscar/route.ts
// GET - Busca de perguntas para template (?q=texto)

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { buscarPerguntasTemplate } from '@/lib/questionarios/repository';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get('q') || '';
    const limite = parseInt(searchParams.get('limite') || '10', 10);

    if (!q.trim() || q.trim().length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const perguntas = await buscarPerguntasTemplate(q.trim(), limite);
    return NextResponse.json({ success: true, data: perguntas });
  } catch (error) {
    console.error('[api/perguntas/buscar] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar perguntas' }, { status: 500 });
  }
}
