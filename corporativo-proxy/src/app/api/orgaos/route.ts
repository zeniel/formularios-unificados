// GET /api/orgaos?tribunal={seqOrgao}&busca={nome}&limite={n}
// Lista órgãos de um tribunal, com busca por nome

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ApiResponse } from '@/lib/types';
import { logger, errorMeta } from '@/lib/logger';

interface OrgaoResumo {
  seqOrgao: number;
  dscOrgao: string;
}

interface OrgaoRow {
  SEQ_ORGAO: number;
  DSC_ORGAO: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tribunalParam = searchParams.get('tribunal');
    const busca = searchParams.get('busca');
    const limiteParam = searchParams.get('limite');

    if (!tribunalParam) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Parâmetro tribunal é obrigatório' },
        { status: 400 }
      );
    }

    const siglaTribunal = tribunalParam.toUpperCase().trim();
    if (!siglaTribunal) {
      logger.warn('Sigla de tribunal vazia');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Sigla de tribunal vazia' },
        { status: 400 }
      );
    }

    const limite = Math.min(parseInt(limiteParam || '20'), 50);

    let sql = `
      SELECT o.SEQ_ORGAO, o.DSC_ORGAO
      FROM orgao o
      INNER JOIN sigla_orgao siglaTribunal ON o.SEQ_TRIBUNAL_PAI = siglaTribunal.SEQ_ORGAO
      WHERE siglaTribunal.DSC_SIGLA = ?
        AND o.SEQ_ORGAO != o.SEQ_TRIBUNAL_PAI
        AND o.FLG_ATIVO = 'S'
    `;
    const params: unknown[] = [siglaTribunal];

    if (busca && busca.trim()) {
      sql += ' AND o.DSC_ORGAO LIKE ?';
      params.push(`%${busca.trim()}%`);
    }

    sql += ' ORDER BY o.DSC_ORGAO';
    sql += ` LIMIT ${limite}`;

    const rows = await query<OrgaoRow>(sql, params);

    const orgaos: OrgaoResumo[] = rows.map(row => ({
      seqOrgao: row.SEQ_ORGAO,
      dscOrgao: row.DSC_ORGAO,
    }));

    logger.info('Orgaos listados', { tribunal: siglaTribunal, busca, count: orgaos.length });

    return NextResponse.json<ApiResponse<OrgaoResumo[]>>({
      success: true,
      data: orgaos,
    });
  } catch (err) {
    logger.error('Falha ao listar orgaos', errorMeta(err));
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
