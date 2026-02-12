// src/lib/corporativo/types.ts
// Tipos para integração com o sistema corporativo CNJ

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

/**
 * Regiões do Brasil
 */
export type Regiao = 'NORTE' | 'NORDESTE' | 'CENTRO_OESTE' | 'SUDESTE' | 'SUL';

/**
 * UFs brasileiras
 */
export type UF = 
  | 'AC' | 'AL' | 'AM' | 'AP' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' 
  | 'MA' | 'MG' | 'MS' | 'MT' | 'PA' | 'PB' | 'PE' | 'PI' | 'PR' 
  | 'RJ' | 'RN' | 'RO' | 'RR' | 'RS' | 'SC' | 'SE' | 'SP' | 'TO';

/**
 * Porte do tribunal
 */
export type PorteTribunal = 'PEQUENO' | 'MEDIO' | 'GRANDE' | 'EXCEPCIONAL';

/**
 * Tipo de órgão
 */
export type TipoOrgao = 
  | 'TRIBUNAL' 
  | 'CONSELHO' 
  | 'VARA' 
  | 'COMARCA' 
  | 'SECAO' 
  | 'SUBSECAO' 
  | 'DEPARTAMENTO';

// ============================================================================
// DTOs do Corporativo
// ============================================================================

/**
 * Dados básicos do usuário
 */
export interface UsuarioCorporativo {
  id: number;
  nome: string;
  cpf: string;
  email?: string;
}

/**
 * Dados do órgão
 */
export interface OrgaoCorporativo {
  id: number;
  descricao: string;
  sigla?: string;
  tipo?: TipoOrgao;
  orgaoPaiId?: number;
}

/**
 * Dados do tribunal
 */
export interface TribunalCorporativo {
  id: number;
  sigla: string;
  descricao: string;
  esfera: EsferaJustica;
  uf: UF;
  regiao?: Regiao;
  porte?: PorteTribunal;
}

/**
 * Contexto completo do usuário (usado para avaliação de filtros)
 */
export interface ContextoUsuario {
  usuario: UsuarioCorporativo;
  orgao: OrgaoCorporativo;
  tribunal: TribunalCorporativo;
  perfilCorporativo?: string;
}

/**
 * Resultado da API de contexto
 */
export interface ContextoUsuarioResponse {
  success: true;
  data: ContextoUsuario;
} | {
  success: false;
  error: string;
}
