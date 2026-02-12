// src/app/auth/callback/route.ts
// Rota de callback da autenticação corporativa CNJ

import { NextRequest, NextResponse } from 'next/server';
import { validarCredencial } from '@/lib/auth/credencial';
import { createSession, UsuarioSessao, PerfilSistema } from '@/lib/auth/session';
import { getCorporativoClient } from '@/lib/corporativo/client';

const CORPORATIVO_URL = process.env.NEXT_PUBLIC_CNJ_CORPORATIVO_URL || 'https://www.cnj.jus.br/corporativo';

/**
 * Mapeia o perfil do corporativo para perfis do sistema admin
 * 
 * Esta função deve ser customizada de acordo com os perfis
 * definidos no sistema corporativo do CNJ.
 * 
 * Exemplo de mapeamento:
 * - ADM* -> ADMINISTRADOR
 * - CGJ* -> PESQUISADOR
 * - SEJ* -> PESQUISADO
 * - ATD* -> VISUALIZADOR
 */
function mapearPerfilCorporativoParaAdmin(
  nomPerfil: string | undefined,
  seqPerfil: number | undefined
): PerfilSistema[] {
  if (!nomPerfil) {
    return ['PESQUISADO']; // Default mínimo
  }

  const prefixo = nomPerfil.substring(0, 3).toUpperCase();
  const perfis: PerfilSistema[] = [];

  // Mapeamento baseado no prefixo do perfil
  switch (prefixo) {
    case 'ADM':
      // Administrador do sistema
      perfis.push('ADMINISTRADOR', 'PESQUISADOR', 'VISUALIZADOR');
      break;
    
    case 'CGJ':
      // Corregedoria - pode pesquisar e ver resultados
      perfis.push('PESQUISADOR', 'VISUALIZADOR');
      break;
    
    case 'SEJ':
      // Serventia - pode responder questionários
      perfis.push('PESQUISADO');
      break;
    
    case 'ATD':
      // Atendimento - pode visualizar
      perfis.push('VISUALIZADOR');
      break;
    
    default:
      // Outros perfis - apenas visualização por padrão
      perfis.push('VISUALIZADOR');
  }

  // TODO: Adicionar lógica adicional baseada em seqPerfil específicos
  // se necessário para casos especiais

  return perfis;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const credencialParam = searchParams.get('c');

  // Validar credencial
  const result = validarCredencial(credencialParam ?? '');

  if (!result.success) {
    const errorUrl = new URL('/auth/erro', request.url);
    errorUrl.searchParams.set('msg', result.error);
    return NextResponse.redirect(errorUrl);
  }

  const { credencial } = result;
  const usuarioCred = credencial.usuario!;

  try {
    // Mapear perfil corporativo para perfis do sistema admin
    const perfisAdmin = mapearPerfilCorporativoParaAdmin(
      credencial.nomPerfil as string | undefined,
      credencial.seqPerfil ? parseInt(String(credencial.seqPerfil), 10) : undefined
    );

    // Se não conseguiu mapear nenhum perfil, não pode acessar
    if (perfisAdmin.length === 0) {
      const errorUrl = new URL('/auth/erro', request.url);
      errorUrl.searchParams.set('msg', 'Usuário sem permissão de acesso ao sistema.');
      return NextResponse.redirect(errorUrl);
    }

    // Buscar dados adicionais do órgão se disponível
    let dadosOrgao: { descricao?: string; sigla?: string; uf?: string } = {};
    
    if (usuarioCred.seqOrgao) {
      const client = getCorporativoClient();
      const orgao = await client.getOrgao(parseInt(String(usuarioCred.seqOrgao), 10));
      if (orgao) {
        dadosOrgao = {
          descricao: orgao.descricao,
          sigla: orgao.sigla,
        };
        
        // Buscar tribunal para obter UF
        const tribunal = await client.getTribunalByOrgao(parseInt(String(usuarioCred.seqOrgao), 10));
        if (tribunal) {
          dadosOrgao.uf = tribunal.uf;
        }
      }
    }

    // Montar dados do usuário
    const usuario: UsuarioSessao = {
      seqUsuario: parseInt(usuarioCred.seqUsuario!, 10),
      nomUsuario: String(usuarioCred.nomUsuario || ''),
      numCpf: usuarioCred.numCpf ? String(usuarioCred.numCpf) : undefined,
      seqOrgao: usuarioCred.seqOrgao ? parseInt(String(usuarioCred.seqOrgao), 10) : undefined,
      dscOrgao: dadosOrgao.descricao,
      siglaOrgao: dadosOrgao.sigla,
      ufOrgao: dadosOrgao.uf,
      seqPerfilCorporativo: credencial.seqPerfil ? parseInt(String(credencial.seqPerfil), 10) : undefined,
      nomPerfilCorporativo: credencial.nomPerfil as string | undefined,
      perfisAdmin,
    };

    // Criar sessão
    await createSession(usuario);

    // Redirecionar para home
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Erro ao processar login:', error);
    const errorUrl = new URL('/auth/erro', request.url);
    errorUrl.searchParams.set('msg', 'Erro interno ao processar autenticação.');
    return NextResponse.redirect(errorUrl);
  }
}
