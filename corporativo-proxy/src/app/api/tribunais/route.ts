// GET /api/tribunais - Lista todos os tribunais

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Tribunal, ApiResponse, parseEsfera } from '@/lib/types';
import { logger, errorMeta } from '@/lib/logger';

interface TribunalRow {
  SEQ_ORGAO: number;
  DSC_ORGAO: string;
  DSC_SIGLA?: string;
  TIP_ESFERA_JUSTICA?: string;
  UFS?: string; // GROUP_CONCAT result
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const esfera = searchParams.get('esfera');
    const uf = searchParams.get('uf');

    logger.debug('Listando tribunais', { filtros: { esfera, uf } });

    let sql = `
      SELECT o.SEQ_ORGAO, o.DSC_ORGAO, s.DSC_SIGLA,
             to2.TIP_ESFERA_JUSTICA,
             GROUP_CONCAT(DISTINCT tu.SIG_UF ORDER BY tu.SIG_UF) AS UFS
      FROM orgao o
      LEFT JOIN sigla_orgao s ON o.SEQ_ORGAO = s.SEQ_ORGAO
      LEFT JOIN tipo_orgao to2 ON o.TIP_ORGAO = to2.TIP_ORGAO
      LEFT JOIN tribunal_uf tu ON o.SEQ_ORGAO = tu.SEQ_ORGAO
      WHERE to2.TIP_ESFERA_JUSTICA IS NOT NULL
        AND o.FLG_ATIVO = 'S'
        AND o.SEQ_ORGAO = o.SEQ_TRIBUNAL_PAI
    `;
    const params: string[] = [];

    if (esfera) {
      // Aceita tanto o código (E, F, T...) quanto a descrição (ESTADUAL, FEDERAL...)
      const codigo = esfera.length === 1 ? esfera.toUpperCase() : null;
      if (codigo) {
        sql += ' AND to2.TIP_ESFERA_JUSTICA = ?';
        params.push(codigo);
      } else {
        // Converter descrição para código
        const mapa: Record<string, string> = {
          SUPERIOR: 'S', ESTADUAL: 'E', FEDERAL: 'F',
          TRABALHO: 'T', ELEITORAL: 'L', MILITAR: 'M',
        };
        const cod = mapa[esfera.toUpperCase()];
        if (cod) {
          sql += ' AND to2.TIP_ESFERA_JUSTICA = ?';
          params.push(cod);
        }
      }
    }

    if (uf) {
      sql += ' AND tu.SIG_UF = ?';
      params.push(uf.toUpperCase());
    }

    sql += ' GROUP BY o.SEQ_ORGAO, o.DSC_ORGAO, s.DSC_SIGLA, to2.TIP_ESFERA_JUSTICA';
    sql += ' ORDER BY to2.TIP_ESFERA_JUSTICA, s.DSC_SIGLA';

    const rows = await query<TribunalRow>(sql, params);

    const tribunais: Tribunal[] = rows.map(row => ({
      seqOrgao: row.SEQ_ORGAO,
      nome: row.DSC_ORGAO,
      sigla: row.DSC_SIGLA ?? '',
      esfera: parseEsfera(row.TIP_ESFERA_JUSTICA),
      ufs: row.UFS ? row.UFS.split(',') : [],
    }));

    logger.info('Tribunais listados', { count: tribunais.length, filtros: { esfera, uf } });

    return NextResponse.json<ApiResponse<Tribunal[]>>({ 
      success: true, 
      data: tribunais 
    });
  } catch (err) {
    logger.error('Falha ao listar tribunais', errorMeta(err));
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
