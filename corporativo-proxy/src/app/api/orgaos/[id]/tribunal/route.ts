// GET /api/orgaos/:id/tribunal - Tribunal do orgao (sobe hierarquia)

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

    // Query que sobe a hierarquia ate encontrar o tribunal raiz
    // Assume que tribunal tem SEQ_ORGAO_PAI = NULL ou aponta para si mesmo
    const row = await queryOne<TribunalRow>(
      `WITH RECURSIVE hierarquia AS (
         SELECT SEQ_ORGAO, DSC_ORGAO, DSC_SIGLA, DSC_ESFERA, SIG_UF, DSC_PORTE, SEQ_ORGAO_PAI
         FROM orgao WHERE SEQ_ORGAO = ?
         UNION ALL
         SELECT o.SEQ_ORGAO, o.DSC_ORGAO, o.DSC_SIGLA, o.DSC_ESFERA, o.SIG_UF, o.DSC_PORTE, o.SEQ_ORGAO_PAI
         FROM orgao o
         INNER JOIN hierarquia h ON o.SEQ_ORGAO = h.SEQ_ORGAO_PAI
         WHERE h.SEQ_ORGAO_PAI IS NOT NULL AND h.SEQ_ORGAO != h.SEQ_ORGAO_PAI
       )
       SELECT SEQ_ORGAO, DSC_ORGAO, DSC_SIGLA, DSC_ESFERA, SIG_UF, DSC_PORTE
       FROM hierarquia
       WHERE SEQ_ORGAO_PAI IS NULL OR DSC_ESFERA IS NOT NULL
       LIMIT 1`,
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
