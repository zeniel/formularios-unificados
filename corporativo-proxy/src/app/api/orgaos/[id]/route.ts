// GET /api/orgaos/:id - Dados do orgao

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { Orgao, ApiResponse } from '@/lib/types';

interface OrgaoRow {
  SEQ_ORGAO: number;
  DSC_ORGAO: string;
  SEQ_ORGAO_PAI?: number;
  DSC_TIPO?: string;
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

    const row = await queryOne<OrgaoRow>(
      `SELECT SEQ_ORGAO, DSC_ORGAO, SEQ_ORGAO_PAI, DSC_TIPO
       FROM orgao WHERE SEQ_ORGAO = ?`,
      [seqOrgao]
    );

    if (!row) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Orgao nao encontrado' },
        { status: 404 }
      );
    }

    const orgao: Orgao = {
      seqOrgao: row.SEQ_ORGAO,
      dscOrgao: row.DSC_ORGAO,
      seqOrgaoPai: row.SEQ_ORGAO_PAI,
      tipo: row.DSC_TIPO,
    };

    return NextResponse.json<ApiResponse<Orgao>>({ success: true, data: orgao });
  } catch (error) {
    console.error('Erro ao buscar orgao:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
