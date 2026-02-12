// src/lib/corporativo/client.ts
// Cliente para integração com o sistema corporativo CNJ
// 
// Acessa dados do corporativo EXCLUSIVAMENTE via corporativo-proxy (REST API).
// Este serviço NÃO tem acesso ao banco corporativo.

import {
  UsuarioCorporativo,
  OrgaoCorporativo,
  OrgaoResumoCorporativo,
  TribunalCorporativo,
  ContextoUsuario,
} from './types';

// ============================================================================
// INTERFACE DO CLIENT
// ============================================================================

export interface ICorporativoClient {
  /** Busca usuário por CPF */
  getUsuario(cpf: string): Promise<UsuarioCorporativo | null>;

  /** Busca órgão por ID (já inclui tribunal via SEQ_TRIBUNAL_PAI) */
  getOrgao(seqOrgao: number): Promise<OrgaoCorporativo | null>;

  /** Busca contexto completo: usuário + órgão + tribunal */
  getContextoUsuario(cpf: string, seqOrgao: number): Promise<ContextoUsuario | null>;

  /** Lista todos os tribunais */
  listarTribunais(): Promise<TribunalCorporativo[]>;

  /** Busca tribunal por sigla (ex: TJSP, TRF3, CNJ) */
  getTribunal(sigla: string): Promise<TribunalCorporativo | null>;

  /** Busca órgãos de um tribunal (por sigla) com filtro por nome */
  buscarOrgaos(siglaTribunal: string, busca?: string): Promise<OrgaoResumoCorporativo[]>;
}

// ============================================================================
// IMPLEMENTAÇÃO VIA CORPORATIVO-PROXY (REST API)
// ============================================================================

interface ProxyResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class CorporativoApiClient implements ICorporativoClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(path: string): Promise<T | null> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 300 }, // Cache 5 min
      });

      if (!response.ok) return null;

      const json: ProxyResponse<T> = await response.json();
      if (!json.success || !json.data) return null;

      return json.data;
    } catch (error) {
      console.error(`Corporativo API error [${path}]:`, error);
      return null;
    }
  }

  private async fetchList<T>(path: string): Promise<T[]> {
    const result = await this.fetch<T[]>(path);
    return result ?? [];
  }

  // --------------------------------------------------------------------------
  // USUARIOS (por CPF)
  // --------------------------------------------------------------------------

  async getUsuario(cpf: string): Promise<UsuarioCorporativo | null> {
    return this.fetch<UsuarioCorporativo>(`/api/usuarios/${cpf}`);
  }

  // --------------------------------------------------------------------------
  // ORGAOS (já inclui tribunal via SEQ_TRIBUNAL_PAI)
  // --------------------------------------------------------------------------

  async getOrgao(seqOrgao: number): Promise<OrgaoCorporativo | null> {
    return this.fetch<OrgaoCorporativo>(`/api/orgaos/${seqOrgao}`);
  }

  // --------------------------------------------------------------------------
  // TRIBUNAIS (por sigla)
  // --------------------------------------------------------------------------

  async getTribunal(sigla: string): Promise<TribunalCorporativo | null> {
    return this.fetch<TribunalCorporativo>(`/api/tribunais/${sigla}`);
  }

  async listarTribunais(): Promise<TribunalCorporativo[]> {
    return this.fetchList<TribunalCorporativo>('/api/tribunais');
  }

  // --------------------------------------------------------------------------
  // ORGAOS DE UM TRIBUNAL (busca por nome)
  // --------------------------------------------------------------------------

  async buscarOrgaos(siglaTribunal: string, busca?: string): Promise<OrgaoResumoCorporativo[]> {
    const params = new URLSearchParams({ tribunal: siglaTribunal });
    if (busca?.trim()) params.set('busca', busca.trim());
    return this.fetchList<OrgaoResumoCorporativo>(`/api/orgaos?${params}`);
  }

  // --------------------------------------------------------------------------
  // CONTEXTO (composto: usuário + órgão + tribunal)
  // --------------------------------------------------------------------------

  async getContextoUsuario(cpf: string, seqOrgao: number): Promise<ContextoUsuario | null> {
    const [usuario, orgao] = await Promise.all([
      this.getUsuario(cpf),
      this.getOrgao(seqOrgao),
    ]);

    if (!usuario || !orgao) return null;

    return {
      usuario,
      orgao,
      tribunal: orgao.tribunal,
    };
  }
}

// ============================================================================
// FACTORY (singleton)
// ============================================================================

let clientInstance: ICorporativoClient | null = null;

export function getCorporativoClient(): ICorporativoClient {
  if (!clientInstance) {
    const apiUrl = process.env.CORPORATIVO_API_URL || 'http://localhost:3001';
    clientInstance = new CorporativoApiClient(apiUrl);
    console.log(`Corporativo: usando API REST (${apiUrl})`);
  }
  return clientInstance;
}
