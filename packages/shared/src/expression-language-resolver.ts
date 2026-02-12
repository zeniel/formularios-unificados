// =============================================================================
// SISTEMA DE RESOLVERS PARA EXPRESSION LANGUAGE
// =============================================================================
// 
// Cada EL tem um resolver registrado que sabe como obter o valor.
// O sistema consulta o registry e executa o resolver apropriado.
//
// =============================================================================

import { CorporativoAPI } from './corporativo-api-client';

// Contexto disponível para os resolvers
export interface ELContexto {
  // Dados da sessão do usuário
  sessao: {
    seqUsuario: number;
    seqOrgao: number;
    seqPerfil?: number;
    nomUsuario: string;
  };
  
  // Dados do questionário atual
  questionario: {
    seqQuestionario: number;
    anoReferencia?: number;
    mesReferencia?: number;
  };
  
  // Cache de dados do corporativo (preenchido sob demanda)
  _cache: {
    tribunal?: TribunalInfo;
    orgao?: OrgaoInfo;
  };
  
  // API do corporativo
  corporativoApi: CorporativoAPI;
}

// Tipos de dados do corporativo
export interface TribunalInfo {
  seqOrgao: number;
  nome: string;
  sigla: string;
  esfera: 'ESTADUAL' | 'FEDERAL' | 'TRABALHO' | 'ELEITORAL' | 'MILITAR' | 'SUPERIOR';
  uf: string;
  porte?: 'PEQUENO' | 'MEDIO' | 'GRANDE';
}

export interface OrgaoInfo {
  seqOrgao: number;
  nome: string;
  tipo: string;
  seqOrgaoPai?: number;
  seqTribunal: number;
}

// Tipo de um resolver
export type ELResolver = (ctx: ELContexto) => Promise<string | number | boolean | null>;

// =============================================================================
// REGISTRY DE RESOLVERS
// =============================================================================

const resolvers: Record<string, ELResolver> = {
  
  // -------------------------------------------------------------------------
  // TRIBUNAL (via Corporativo API)
  // -------------------------------------------------------------------------
  
  'EL_ESFERA': async (ctx) => {
    const tribunal = await getTribunal(ctx);
    return tribunal?.esfera ?? null;
  },
  
  'EL_UF': async (ctx) => {
    const tribunal = await getTribunal(ctx);
    return tribunal?.uf ?? null;
  },
  
  'EL_SIGLA_TRIBUNAL': async (ctx) => {
    const tribunal = await getTribunal(ctx);
    return tribunal?.sigla ?? null;
  },
  
  'EL_NOME_TRIBUNAL': async (ctx) => {
    const tribunal = await getTribunal(ctx);
    return tribunal?.nome ?? null;
  },
  
  'EL_PORTE': async (ctx) => {
    const tribunal = await getTribunal(ctx);
    return tribunal?.porte ?? null;
  },
  
  // -------------------------------------------------------------------------
  // ÓRGÃO (via Corporativo API)
  // -------------------------------------------------------------------------
  
  'EL_SEQ_ORGAO': async (ctx) => {
    return ctx.sessao.seqOrgao;
  },
  
  'EL_TIPO_ORGAO': async (ctx) => {
    const orgao = await getOrgao(ctx);
    return orgao?.tipo ?? null;
  },
  
  // -------------------------------------------------------------------------
  // USUÁRIO (da sessão)
  // -------------------------------------------------------------------------
  
  'EL_SEQ_USUARIO': async (ctx) => {
    return ctx.sessao.seqUsuario;
  },
  
  'EL_PERFIL': async (ctx) => {
    return ctx.sessao.seqPerfil ?? null;
  },
  
  // -------------------------------------------------------------------------
  // CALCULADOS
  // -------------------------------------------------------------------------
  
  'EL_ANO_ATUAL': async () => {
    return new Date().getFullYear();
  },
  
  'EL_MES_ATUAL': async () => {
    return new Date().getMonth() + 1; // 1-12
  },
  
  'EL_DATA_ATUAL': async () => {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  },
  
  // -------------------------------------------------------------------------
  // QUESTIONÁRIO
  // -------------------------------------------------------------------------
  
  'EL_ANO_REFERENCIA': async (ctx) => {
    return ctx.questionario.anoReferencia ?? new Date().getFullYear();
  },
  
  'EL_MES_REFERENCIA': async (ctx) => {
    return ctx.questionario.mesReferencia ?? null;
  },
};

// =============================================================================
// HELPERS PARA CACHE
// =============================================================================

async function getTribunal(ctx: ELContexto): Promise<TribunalInfo | null> {
  // Verificar cache
  if (ctx._cache.tribunal) {
    return ctx._cache.tribunal;
  }
  
  // Buscar do corporativo
  try {
    const tribunal = await ctx.corporativoApi.getTribunalDoOrgao(ctx.sessao.seqOrgao);
    ctx._cache.tribunal = tribunal as unknown as TribunalInfo;
    return ctx._cache.tribunal;
  } catch (error) {
    console.error('Erro ao buscar tribunal:', error);
    return null;
  }
}

async function getOrgao(ctx: ELContexto): Promise<OrgaoInfo | null> {
  if (ctx._cache.orgao) {
    return ctx._cache.orgao;
  }
  
  try {
    const orgao = await ctx.corporativoApi.getOrgao(ctx.sessao.seqOrgao);
    ctx._cache.orgao = orgao as unknown as OrgaoInfo;
    return ctx._cache.orgao;
  } catch (error) {
    console.error('Erro ao buscar órgão:', error);
    return null;
  }
}

// =============================================================================
// API PÚBLICA
// =============================================================================

/**
 * Verifica se existe um resolver para a EL
 */
export function existeResolver(codigoEL: string): boolean {
  return codigoEL in resolvers;
}

/**
 * Lista todas as ELs disponíveis
 */
export function listarELsDisponiveis(): string[] {
  return Object.keys(resolvers);
}

/**
 * Resolve uma EL e retorna seu valor
 */
export async function resolverEL(
  codigoEL: string, 
  contexto: ELContexto
): Promise<string | number | boolean | null> {
  const resolver = resolvers[codigoEL];
  
  if (!resolver) {
    console.warn(`EL não encontrada: ${codigoEL}`);
    return null;
  }
  
  try {
    return await resolver(contexto);
  } catch (error) {
    console.error(`Erro ao resolver EL ${codigoEL}:`, error);
    return null;
  }
}

/**
 * Resolve múltiplas ELs de uma vez (otimizado)
 */
export async function resolverMultiplasELs(
  codigosEL: string[],
  contexto: ELContexto
): Promise<Record<string, string | number | boolean | null>> {
  const resultado: Record<string, string | number | boolean | null> = {};
  
  // Executar em paralelo
  await Promise.all(
    codigosEL.map(async (codigo) => {
      resultado[codigo] = await resolverEL(codigo, contexto);
    })
  );
  
  return resultado;
}

/**
 * Cria um contexto vazio para uso
 */
export function criarContextoEL(
  sessao: ELContexto['sessao'],
  questionario: ELContexto['questionario'],
  corporativoApi: CorporativoAPI
): ELContexto {
  return {
    sessao,
    questionario,
    _cache: {},
    corporativoApi,
  };
}
