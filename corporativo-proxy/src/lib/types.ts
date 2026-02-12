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
}

// Dados do órgão
export interface Orgao {
  seqOrgao: number;
  dscOrgao: string;
  seqOrgaoPai?: number;
  tipo?: string;
}

// Dados do tribunal
export interface Tribunal {
  seqOrgao: number;
  nome: string;
  sigla: string;
  esfera: 'ESTADUAL' | 'FEDERAL' | 'TRABALHO' | 'ELEITORAL' | 'MILITAR' | 'SUPERIOR';
  uf: string;
  porte?: 'PEQUENO' | 'MEDIO' | 'GRANDE';
}

// Response padrão da API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
