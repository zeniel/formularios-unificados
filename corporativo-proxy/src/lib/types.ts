// =============================================================================
// TIPOS DO CORPORATIVO PROXY
// =============================================================================

// Dados do usuário
export interface Usuario {
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

// Dados do órgão
export interface Orgao {
  seqOrgao: number;
  dscOrgao: string;
  seqOrgaoPai?: number;
  tipoOrgao?: {
    codigo: string;
    descricao: string;
  };
  tribunal?: Tribunal;
}

// Esferas da justiça
export type EsferaJustica = 'ESTADUAL' | 'FEDERAL' | 'TRABALHO' | 'ELEITORAL' | 'MILITAR' | 'SUPERIOR';

// Mapeamento do código do banco → descrição
const ESFERA_MAP: Record<string, EsferaJustica> = {
  S: 'SUPERIOR',
  E: 'ESTADUAL',
  F: 'FEDERAL',
  T: 'TRABALHO',
  L: 'ELEITORAL',
  M: 'MILITAR',
};

/**
 * Converte código de esfera do banco (S, E, F, T, L, M) para descrição
 */
export function parseEsfera(codigo?: string | null): EsferaJustica | undefined {
  if (!codigo) return undefined;
  return ESFERA_MAP[codigo.toUpperCase()];
}

// Dados do tribunal
export interface Tribunal {
  seqOrgao: number;
  nome: string;
  sigla: string;
  esfera?: EsferaJustica;
  ufs: string[];
}

// Response padrão da API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
