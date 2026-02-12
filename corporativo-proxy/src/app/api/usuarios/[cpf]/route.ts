// GET /api/usuarios/:cpf - Dados do usuario pelo CPF

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { Usuario, ApiResponse } from '@/lib/types';
import { logger, errorMeta } from '@/lib/logger';

interface UsuarioRow {
  SEQ_USUARIO: number;
  NOM_USUARIO: string;
  NUM_CPF: string;
  DSC_EMAIL?: string;
  SEQ_ORGAO: number;
  SIG_TIPO_CARGO?: string;
  DSC_TIPO_CARGO?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { cpf: string } }
) {
  const cpf = params.cpf.replace(/\D/g, '').trim(); // Remove pontos, tracos, etc.

  try {
    if (!cpf || cpf.length < 11) {
      logger.warn('CPF invalido', { cpf: cpf.substring(0, 3) + '***' });
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'CPF invalido' },
        { status: 400 }
      );
    }

    const row = await queryOne<UsuarioRow>(
      `SELECT u.SEQ_USUARIO, u.NOM_USUARIO, u.NUM_CPF, ue.DSC_EMAIL, u.SEQ_ORGAO,
              tc.SIG_TIPO_CARGO, tc.DSC_TIPO_CARGO
       FROM usuario u
       LEFT JOIN usuario_email ue ON u.SEQ_USUARIO = ue.SEQ_USUARIO
       LEFT JOIN tipo_cargo tc ON u.SIG_TIPO_CARGO = tc.SIG_TIPO_CARGO
       WHERE u.NUM_CPF = ?
         AND u.FLG_ATIVO = 'S'`,
      [cpf]
    );

    if (!row) {
      logger.info('Usuario nao encontrado ou inativo pelo CPF');
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
      cargo: row.SIG_TIPO_CARGO
        ? { sigla: row.SIG_TIPO_CARGO, descricao: row.DSC_TIPO_CARGO! }
        : undefined,
    };

    // Don't log CPF - sensitive data
    logger.info('Usuario encontrado', {
      seqUsuario: usuario.seqUsuario,
      nome: usuario.nomUsuario,
      cargo: usuario.cargo?.sigla,
    });

    return NextResponse.json<ApiResponse<Usuario>>({ success: true, data: usuario });
  } catch (err) {
    logger.error('Falha ao buscar usuario por CPF', errorMeta(err));
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
