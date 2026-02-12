// GET /api/tribunais/:id - Dados de um tribunal especifico

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { Tribunal, ApiResponse, parseEsfera } from '@/lib/types';
import { logger, errorMeta } from '@/lib/logger';

interface TribunalRow {
  SEQ_ORGAO: number;
  DSC_ORGAO: string;
  DSC_SIGLA?: string;
  TIP_ESFERA_JUSTICA?: string;
  UFS?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const seqOrgao = parseInt(id);
    
    if (isNaN(seqOrgao)) {
      logger.warn('ID de tribunal invalido', { id });
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'ID invalido' },
        { status: 400 }
      );
    }

    const row = await queryOne<TribunalRow>(
      `SELECT o.SEQ_ORGAO, o.DSC_ORGAO, s.DSC_SIGLA,
              to2.TIP_ESFERA_JUSTICA,
              GROUP_CONCAT(DISTINCT tu.SIG_UF ORDER BY tu.SIG_UF) AS UFS
       FROM orgao o
       LEFT JOIN sigla_orgao s ON o.SEQ_ORGAO = s.SEQ_ORGAO
       LEFT JOIN tipo_orgao to2 ON o.TIP_ORGAO = to2.TIP_ORGAO
       LEFT JOIN tribunal_uf tu ON o.SEQ_ORGAO = tu.SEQ_ORGAO
       WHERE o.SEQ_ORGAO = ?
         AND to2.TIP_ESFERA_JUSTICA IS NOT NULL
       GROUP BY o.SEQ_ORGAO, o.DSC_ORGAO, s.DSC_SIGLA, to2.TIP_ESFERA_JUSTICA`,
      [seqOrgao]
    );

    if (!row) {
      logger.info('Tribunal nao encontrado', { seqOrgao });
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Tribunal nao encontrado' },
        { status: 404 }
      );
    }

    const tribunal: Tribunal = {
      seqOrgao: row.SEQ_ORGAO,
      nome: row.DSC_ORGAO,
      sigla: row.DSC_SIGLA ?? '',
      esfera: parseEsfera(row.TIP_ESFERA_JUSTICA),
      ufs: row.UFS ? row.UFS.split(',') : [],
    };

    logger.info('Tribunal encontrado', { seqOrgao, sigla: tribunal.sigla, esfera: tribunal.esfera });

    return NextResponse.json<ApiResponse<Tribunal>>({ success: true, data: tribunal });
  } catch (err) {
    logger.error('Falha ao buscar tribunal', { id, ...errorMeta(err) });
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
