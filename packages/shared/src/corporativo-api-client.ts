// =============================================================================
// CLIENTE PARA O CORPORATIVO PROXY
// =============================================================================
// 
// Use este cliente nos sistemas que precisam acessar dados do corporativo.
// Importar em: questionario-admin, questionario-respondente, etc.
//
// =============================================================================

// Tipos
export interface Usuario {
  seqUsuario: number;
  nomUsuario: string;
  numCpf: string;
  dscEmail?: string;
  seqOrgao: number;
}

export interface Orgao {
  seqOrgao: number;
  dscOrgao: string;
  seqOrgaoPai?: number;
  tipo?: string;
}

export interface Tribunal {
  seqOrgao: number;
  nome: string;
  sigla: string;
  esfera: 'ESTADUAL' | 'FEDERAL' | 'TRABALHO' | 'ELEITORAL' | 'MILITAR' | 'SUPERIOR';
  uf: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// CLIENTE
// =============================================================================

export class CorporativoAPI {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.CORPORATIVO_PROXY_URL || 'http://localhost:3001';
  }

  private async fetch<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      // Cache por 5 minutos (dados do corporativo mudam pouco)
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json: ApiResponse<T> = await response.json();
    
    if (!json.success) {
      throw new Error(json.error || 'Erro desconhecido');
    }

    return json.data!;
  }

  // ---------------------------------------------------------------------------
  // USUARIOS
  // ---------------------------------------------------------------------------

  async getUsuario(numCpf: string): Promise<Usuario> {
    return this.fetch<Usuario>(`/api/usuarios/${numCpf}`);
  }

  // ---------------------------------------------------------------------------
  // ORGAOS
  // ---------------------------------------------------------------------------

  async getOrgao(seqOrgao: number): Promise<Orgao> {
    return this.fetch<Orgao>(`/api/orgaos/${seqOrgao}`);
  }

  async getTribunalDoOrgao(seqOrgao: number): Promise<Tribunal> {
    return this.fetch<Tribunal>(`/api/orgaos/${seqOrgao}/tribunal`);
  }

  // ---------------------------------------------------------------------------
  // TRIBUNAIS
  // ---------------------------------------------------------------------------

  async getTribunal(sigla: string): Promise<Tribunal> {
    return this.fetch<Tribunal>(`/api/tribunais/${sigla}`);
  }

  async listarTribunais(filtros?: { esfera?: string; uf?: string }): Promise<Tribunal[]> {
    const params = new URLSearchParams();
    if (filtros?.esfera) params.set('esfera', filtros.esfera);
    if (filtros?.uf) params.set('uf', filtros.uf);
    
    const query = params.toString();
    const path = query ? `/api/tribunais?${query}` : '/api/tribunais';
    
    return this.fetch<Tribunal[]>(path);
  }

  async listarTribunaisPorEsfera(esfera: Tribunal['esfera']): Promise<Tribunal[]> {
    return this.listarTribunais({ esfera });
  }

  async listarTribunaisPorUF(uf: string): Promise<Tribunal[]> {
    return this.listarTribunais({ uf });
  }
}

// Instancia singleton para uso direto
export const corporativoApi = new CorporativoAPI();
