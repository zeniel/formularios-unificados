// GET /api/tribunais - Lista todos os tribunais

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Tribunal, ApiResponse } from '@/lib/types';

interface TribunalRow {
  SEQ_ORGAO: number;
  DSC_ORGAO: string;
  DSC_SIGLA: string;
  DSC_ESFERA: string;
  SIG_UF: string;
  DSC_PORTE?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const esfera = searchParams.get('esfera');
    const uf = searchParams.get('uf');

    let sql = `
      SELECT SEQ_ORGAO, DSC_ORGAO, DSC_SIGLA, DSC_ESFERA, SIG_UF, DSC_PORTE
      FROM orgao
      WHERE DSC_ESFERA IS NOT NULL
        AND (SEQ_ORGAO_PAI IS NULL OR SEQ_ORGAO = SEQ_ORGAO_PAI)
    `;
    const params: string[] = [];

    if (esfera) {
      sql += ' AND DSC_ESFERA = ?';
      params.push(esfera.toUpperCase());
    }

    if (uf) {
      sql += ' AND SIG_UF = ?';
      params.push(uf.toUpperCase());
    }

    sql += ' ORDER BY DSC_ESFERA, SIG_UF, DSC_SIGLA';

    const rows = await query<TribunalRow>(sql, params);

    const tribunais: Tribunal[] = rows.map(row => ({
      seqOrgao: row.SEQ_ORGAO,
      nome: row.DSC_ORGAO,
      sigla: row.DSC_SIGLA,
      esfera: row.DSC_ESFERA as Tribunal['esfera'],
      uf: row.SIG_UF,
      porte: row.DSC_PORTE as Tribunal['porte'],
    }));

    return NextResponse.json<ApiResponse<Tribunal[]>>({ 
      success: true, 
      data: tribunais 
    });
  } catch (error) {
    console.error('Erro ao listar tribunais:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
