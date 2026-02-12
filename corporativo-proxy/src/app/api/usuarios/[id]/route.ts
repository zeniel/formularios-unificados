// GET /api/usuarios/:id - Dados do usuario

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { Usuario, ApiResponse } from '@/lib/types';

interface UsuarioRow {
  SEQ_USUARIO: number;
  NOM_USUARIO: string;
  NUM_CPF: string;
  DSC_EMAIL?: string;
  SEQ_ORGAO: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const seqUsuario = parseInt(params.id);
    
    if (isNaN(seqUsuario)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'ID invalido' },
        { status: 400 }
      );
    }

    const row = await queryOne<UsuarioRow>(
      `SELECT SEQ_USUARIO, NOM_USUARIO, NUM_CPF, DSC_EMAIL, SEQ_ORGAO
       FROM usuario WHERE SEQ_USUARIO = ?`,
      [seqUsuario]
    );

    if (!row) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Usuario nao encontrado' },
        { status: 404 }
      );
    }

    const usuario: Usuario = {
      seqUsuario: row.SEQ_USUARIO,
      nomUsuario: row.NOM_USUARIO,
      numCpf: row.NUM_CPF,
      dscEmail: row.DSC_EMAIL,
      seqOrgao: row.SEQ_ORGAO,
    };

    return NextResponse.json<ApiResponse<Usuario>>({ success: true, data: usuario });
  } catch (error) {
    console.error('Erro ao buscar usuario:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
