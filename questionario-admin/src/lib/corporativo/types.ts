// src/lib/corporativo/types.ts
// Tipos para integração com o sistema corporativo CNJ (via corporativo-proxy)

/**
 * Esferas da Justiça brasileira
 */
export type EsferaJustica = 
  | 'ESTADUAL' 
  | 'FEDERAL' 
  | 'MILITAR' 
  | 'ELEITORAL' 
  | 'TRABALHO' 
  | 'SUPERIOR';

// ============================================================================
// DTOs do Corporativo Proxy
// ============================================================================

/**
 * Dados do usuário (retornado por GET /api/usuarios/:cpf)
 */
export interface UsuarioCorporativo {
  seqUsuario: number;
  nomUsuario: string;
  numCpf: string;
  dscEmail?: string;
  seqOrgao: number;
  cargo?: {
    sigla: string;
    descricao: string;
  };
}

/**
 * Dados do tribunal
 */
export interface TribunalCorporativo {
  seqOrgao: number;
  nome: string;
  sigla: string;
  esfera?: EsferaJustica;
  ufs: string[];
}

/**
 * Dados do órgão (retornado por GET /api/orgaos/:id)
 * Já inclui o tribunal associado
 */
export interface OrgaoCorporativo {
  seqOrgao: number;
  dscOrgao: string;
  seqOrgaoPai?: number;
  tipoOrgao?: {
    codigo: string;
    descricao: string;
  };
  tribunal?: TribunalCorporativo;
}

/**
 * Contexto completo do usuário (usado para avaliação de filtros)
 */
export interface ContextoUsuario {
  usuario: UsuarioCorporativo;
  orgao: OrgaoCorporativo;
  tribunal?: TribunalCorporativo;
}
