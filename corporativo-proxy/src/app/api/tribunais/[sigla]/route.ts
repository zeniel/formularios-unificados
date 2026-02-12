// GET /api/tribunais/:sigla - Dados de um tribunal pela sigla (ex: TJSP, TRF3, CNJ)

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { Tribunal, ApiResponse, parseEsfera } from '@/lib/types';
import { logger, errorMeta } from '@/lib/logger';

interface TribunalRow {
  SEQ_ORGAO: number;
  DSC_ORGAO: string;
  DSC_SIGLA: string;
  TIP_ESFERA_JUSTICA?: string;
  UFS?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sigla: string } }
) {
  const sigla = params.sigla.toUpperCase().trim();

  try {
    if (!sigla) {
      logger.warn('Sigla de tribunal vazia');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Sigla invalida' },
        { status: 400 }
      );
    }

    const row = await queryOne<TribunalRow>(
      `SELECT o.SEQ_ORGAO, o.DSC_ORGAO, s.DSC_SIGLA,
              to2.TIP_ESFERA_JUSTICA,
              GROUP_CONCAT(DISTINCT tu.SIG_UF ORDER BY tu.SIG_UF) AS UFS
       FROM orgao o
       INNER JOIN sigla_orgao s ON o.SEQ_ORGAO = s.SEQ_ORGAO
       LEFT JOIN tipo_orgao to2 ON o.TIP_ORGAO = to2.TIP_ORGAO
       LEFT JOIN tribunal_uf tu ON o.SEQ_ORGAO = tu.SEQ_ORGAO
       WHERE s.DSC_SIGLA = ?
         AND o.SEQ_TRIBUNAL_PAI = o.SEQ_ORGAO
       GROUP BY o.SEQ_ORGAO, o.DSC_ORGAO, s.DSC_SIGLA, to2.TIP_ESFERA_JUSTICA`,
      [sigla]
    );

    if (!row) {
      logger.info('Tribunal nao encontrado pela sigla', { sigla });
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Tribunal nao encontrado' },
        { status: 404 }
      );
    }

    const tribunal: Tribunal = {
      seqOrgao: row.SEQ_ORGAO,
      nome: row.DSC_ORGAO,
      sigla: row.DSC_SIGLA,
      esfera: parseEsfera(row.TIP_ESFERA_JUSTICA),
      ufs: row.UFS ? row.UFS.split(',') : [],
    };

    logger.info('Tribunal encontrado', { sigla, seqOrgao: tribunal.seqOrgao, esfera: tribunal.esfera });

    return NextResponse.json<ApiResponse<Tribunal>>({ success: true, data: tribunal });
  } catch (err) {
    logger.error('Falha ao buscar tribunal', { sigla, ...errorMeta(err) });
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
