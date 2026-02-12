// GET /api/tribunais/:id - Dados de um tribunal especifico

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { Tribunal, ApiResponse } from '@/lib/types';

interface TribunalRow {
  SEQ_ORGAO: number;
  DSC_ORGAO: string;
  DSC_SIGLA: string;
  DSC_ESFERA: string;
  SIG_UF: string;
  DSC_PORTE?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const seqOrgao = parseInt(params.id);
    
    if (isNaN(seqOrgao)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'ID invalido' },
        { status: 400 }
      );
    }

    const row = await queryOne<TribunalRow>(
      `SELECT SEQ_ORGAO, DSC_ORGAO, DSC_SIGLA, DSC_ESFERA, SIG_UF, DSC_PORTE
       FROM orgao
       WHERE SEQ_ORGAO = ? AND DSC_ESFERA IS NOT NULL`,
      [seqOrgao]
    );

    if (!row) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Tribunal nao encontrado' },
        { status: 404 }
      );
    }

    const tribunal: Tribunal = {
      seqOrgao: row.SEQ_ORGAO,
      nome: row.DSC_ORGAO,
      sigla: row.DSC_SIGLA,
      esfera: row.DSC_ESFERA as Tribunal['esfera'],
      uf: row.SIG_UF,
      porte: row.DSC_PORTE as Tribunal['porte'],
    };

    return NextResponse.json<ApiResponse<Tribunal>>({ success: true, data: tribunal });
  } catch (error) {
    console.error('Erro ao buscar tribunal:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
