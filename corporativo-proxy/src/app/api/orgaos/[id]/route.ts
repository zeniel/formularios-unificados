// GET /api/orgaos/:id - Dados do orgao + tribunal

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { Orgao, ApiResponse, parseEsfera } from '@/lib/types';
import { logger, errorMeta } from '@/lib/logger';

interface OrgaoRow {
  // Orgao
  SEQ_ORGAO: number;
  DSC_ORGAO: string;
  SEQ_ORGAO_PAI?: number;
  TIP_ORGAO?: string;
  DSC_TIP_ORGAO?: string;
  // Tribunal
  TRIB_SEQ_ORGAO?: number;
  TRIB_DSC_ORGAO?: string;
  TRIB_SIGLA?: string;
  TRIB_ESFERA?: string;
  TRIB_UFS?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const seqOrgao = parseInt(id);
    
    if (isNaN(seqOrgao)) {
      logger.warn('ID de orgao invalido', { id });
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'ID invalido' },
        { status: 400 }
      );
    }

    const row = await queryOne<OrgaoRow>(
      `SELECT o.SEQ_ORGAO, o.DSC_ORGAO, o.SEQ_ORGAO_PAI,
              to2.TIP_ORGAO, to2.DSC_TIP_ORGAO,
              t.SEQ_ORGAO AS TRIB_SEQ_ORGAO,
              t.DSC_ORGAO AS TRIB_DSC_ORGAO,
              s.DSC_SIGLA AS TRIB_SIGLA,
              to3.TIP_ESFERA_JUSTICA AS TRIB_ESFERA,
              GROUP_CONCAT(DISTINCT tu.SIG_UF ORDER BY tu.SIG_UF) AS TRIB_UFS
       FROM orgao o
       LEFT JOIN tipo_orgao to2 ON o.TIP_ORGAO = to2.TIP_ORGAO
       LEFT JOIN orgao t ON o.SEQ_TRIBUNAL_PAI = t.SEQ_ORGAO
       LEFT JOIN sigla_orgao s ON t.SEQ_ORGAO = s.SEQ_ORGAO
       LEFT JOIN tipo_orgao to3 ON t.TIP_ORGAO = to3.TIP_ORGAO
       LEFT JOIN tribunal_uf tu ON t.SEQ_ORGAO = tu.SEQ_ORGAO
       WHERE o.FLG_ATIVO = 'S' AND o.SEQ_ORGAO = ?
       GROUP BY o.SEQ_ORGAO, o.DSC_ORGAO, o.SEQ_ORGAO_PAI,
                to2.TIP_ORGAO, to2.DSC_TIP_ORGAO,
                t.SEQ_ORGAO, t.DSC_ORGAO, s.DSC_SIGLA, to3.TIP_ESFERA_JUSTICA`,
      [seqOrgao]
    );

    if (!row) {
      logger.info('Orgao nao encontrado', { seqOrgao });
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Orgao nao encontrado' },
        { status: 404 }
      );
    }

    const orgao: Orgao = {
      seqOrgao: row.SEQ_ORGAO,
      dscOrgao: row.DSC_ORGAO,
      seqOrgaoPai: row.SEQ_ORGAO_PAI,
      tipoOrgao: row.TIP_ORGAO
        ? { codigo: row.TIP_ORGAO, descricao: row.DSC_TIP_ORGAO! }
        : undefined,
      tribunal: row.TRIB_SEQ_ORGAO
        ? {
            seqOrgao: row.TRIB_SEQ_ORGAO,
            nome: row.TRIB_DSC_ORGAO!,
            sigla: row.TRIB_SIGLA ?? '',
            esfera: parseEsfera(row.TRIB_ESFERA),
            ufs: row.TRIB_UFS ? row.TRIB_UFS.split(',') : [],
          }
        : undefined,
    };

    logger.info('Orgao encontrado', {
      seqOrgao,
      descricao: orgao.dscOrgao,
      tipo: orgao.tipoOrgao?.codigo,
      tribunal: orgao.tribunal?.sigla,
    });

    return NextResponse.json<ApiResponse<Orgao>>({ success: true, data: orgao });
  } catch (err) {
    logger.error('Falha ao buscar orgao', { id, ...errorMeta(err) });
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
