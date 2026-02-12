// src/lib/corporativo/client.ts
// Cliente para integração com o sistema corporativo CNJ
// 
// ARQUITETURA:
// - Interface ICorporativoClient define o contrato
// - CorporativoDbClient: implementação atual (acesso direto ao banco)
// - CorporativoApiClient: implementação futura (via API REST)
//
// Quando o CNJ disponibilizar uma API, basta criar CorporativoApiClient
// e trocar a instância no factory.

import {
  UsuarioCorporativo,
  OrgaoCorporativo,
  TribunalCorporativo,
  ContextoUsuario,
  EsferaJustica,
  UF,
  Regiao,
} from './types';
import { prisma } from '@/lib/db';

// ============================================================================
// INTERFACE DO CLIENT
// ============================================================================

export interface ICorporativoClient {
  /**
   * Busca dados do usuário por ID
   */
  getUsuario(seqUsuario: number): Promise<UsuarioCorporativo | null>;

  /**
   * Busca dados do órgão por ID
   */
  getOrgao(seqOrgao: number): Promise<OrgaoCorporativo | null>;

  /**
   * Busca dados do tribunal por ID do órgão
   * (Sobe na hierarquia até encontrar o tribunal raiz)
   */
  getTribunalByOrgao(seqOrgao: number): Promise<TribunalCorporativo | null>;

  /**
   * Busca o contexto completo do usuário
   */
  getContextoUsuario(seqUsuario: number, seqOrgao: number): Promise<ContextoUsuario | null>;

  /**
   * Lista todos os tribunais
   */
  listarTribunais(): Promise<TribunalCorporativo[]>;

  /**
   * Lista órgãos de um tribunal
   */
  listarOrgaosTribunal(seqTribunal: number): Promise<OrgaoCorporativo[]>;
}

// ============================================================================
// IMPLEMENTAÇÃO VIA BANCO DE DADOS (ATUAL)
// ============================================================================

export class CorporativoDbClient implements ICorporativoClient {
  
  async getUsuario(seqUsuario: number): Promise<UsuarioCorporativo | null> {
    try {
      const result = await prisma.$queryRaw<Array<{
        SEQ_USUARIO: number;
        NOM_USUARIO: string;
        NUM_CPF: string;
        DSC_EMAIL: string | null;
      }>>`
        SELECT 
          SEQ_USUARIO,
          NOM_USUARIO,
          NUM_CPF,
          DSC_EMAIL
        FROM corporativo.usuario
        WHERE SEQ_USUARIO = ${seqUsuario}
      `;

      if (!result || result.length === 0) return null;

      const row = result[0];
      return {
        id: row.SEQ_USUARIO,
        nome: row.NOM_USUARIO,
        cpf: row.NUM_CPF,
        email: row.DSC_EMAIL ?? undefined,
      };
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }
  }

  async getOrgao(seqOrgao: number): Promise<OrgaoCorporativo | null> {
    try {
      const result = await prisma.$queryRaw<Array<{
        SEQ_ORGAO: number;
        DSC_ORGAO: string;
        DSC_SIGLA: string | null;
        SEQ_ORGAO_PAI: number | null;
      }>>`
        SELECT 
          SEQ_ORGAO,
          DSC_ORGAO,
          DSC_SIGLA,
          SEQ_ORGAO_PAI
        FROM corporativo.orgao
        WHERE SEQ_ORGAO = ${seqOrgao}
      `;

      if (!result || result.length === 0) return null;

      const row = result[0];
      return {
        id: row.SEQ_ORGAO,
        descricao: row.DSC_ORGAO,
        sigla: row.DSC_SIGLA ?? undefined,
        orgaoPaiId: row.SEQ_ORGAO_PAI ?? undefined,
      };
    } catch (error) {
      console.error('Erro ao buscar órgão:', error);
      return null;
    }
  }

  async getTribunalByOrgao(seqOrgao: number): Promise<TribunalCorporativo | null> {
    try {
      // Subir na hierarquia até encontrar o tribunal raiz
      // (órgão sem pai ou que é um tribunal)
      const result = await prisma.$queryRaw<Array<{
        SEQ_ORGAO: number;
        DSC_ORGAO: string;
        DSC_SIGLA: string;
        SIG_UF: string;
        DSC_ESFERA: string | null;
        DSC_REGIAO: string | null;
        DSC_PORTE: string | null;
      }>>`
        WITH RECURSIVE hierarquia AS (
          -- Base: órgão inicial
          SELECT 
            o.SEQ_ORGAO,
            o.DSC_ORGAO,
            o.DSC_SIGLA,
            o.SIG_UF,
            o.SEQ_ORGAO_PAI,
            1 as nivel
          FROM corporativo.orgao o
          WHERE o.SEQ_ORGAO = ${seqOrgao}
          
          UNION ALL
          
          -- Recursão: subir para o pai
          SELECT 
            o.SEQ_ORGAO,
            o.DSC_ORGAO,
            o.DSC_SIGLA,
            o.SIG_UF,
            o.SEQ_ORGAO_PAI,
            h.nivel + 1
          FROM corporativo.orgao o
          INNER JOIN hierarquia h ON o.SEQ_ORGAO = h.SEQ_ORGAO_PAI
          WHERE h.nivel < 10  -- Limitar recursão
        )
        SELECT 
          h.SEQ_ORGAO,
          h.DSC_ORGAO,
          h.DSC_SIGLA,
          h.SIG_UF,
          NULL as DSC_ESFERA,
          NULL as DSC_REGIAO,
          NULL as DSC_PORTE
        FROM hierarquia h
        WHERE h.SEQ_ORGAO_PAI IS NULL
        ORDER BY h.nivel DESC
        LIMIT 1
      `;

      if (!result || result.length === 0) return null;

      const row = result[0];
      
      // Inferir esfera pela sigla (heurística)
      const esfera = this.inferirEsfera(row.DSC_SIGLA, row.DSC_ORGAO);
      const regiao = this.inferirRegiao(row.SIG_UF as UF);

      return {
        id: row.SEQ_ORGAO,
        sigla: row.DSC_SIGLA,
        descricao: row.DSC_ORGAO,
        esfera,
        uf: row.SIG_UF as UF,
        regiao,
        porte: row.DSC_PORTE as any ?? undefined,
      };
    } catch (error) {
      console.error('Erro ao buscar tribunal:', error);
      return null;
    }
  }

  async getContextoUsuario(seqUsuario: number, seqOrgao: number): Promise<ContextoUsuario | null> {
    const [usuario, orgao, tribunal] = await Promise.all([
      this.getUsuario(seqUsuario),
      this.getOrgao(seqOrgao),
      this.getTribunalByOrgao(seqOrgao),
    ]);

    if (!usuario || !orgao || !tribunal) {
      return null;
    }

    return {
      usuario,
      orgao,
      tribunal,
    };
  }

  async listarTribunais(): Promise<TribunalCorporativo[]> {
    try {
      const result = await prisma.$queryRaw<Array<{
        SEQ_ORGAO: number;
        DSC_ORGAO: string;
        DSC_SIGLA: string;
        SIG_UF: string;
      }>>`
        SELECT 
          SEQ_ORGAO,
          DSC_ORGAO,
          DSC_SIGLA,
          SIG_UF
        FROM corporativo.orgao
        WHERE SEQ_ORGAO_PAI IS NULL
          AND DSC_SIGLA IS NOT NULL
        ORDER BY DSC_SIGLA
      `;

      return result.map(row => ({
        id: row.SEQ_ORGAO,
        sigla: row.DSC_SIGLA,
        descricao: row.DSC_ORGAO,
        esfera: this.inferirEsfera(row.DSC_SIGLA, row.DSC_ORGAO),
        uf: row.SIG_UF as UF,
        regiao: this.inferirRegiao(row.SIG_UF as UF),
      }));
    } catch (error) {
      console.error('Erro ao listar tribunais:', error);
      return [];
    }
  }

  async listarOrgaosTribunal(seqTribunal: number): Promise<OrgaoCorporativo[]> {
    try {
      const result = await prisma.$queryRaw<Array<{
        SEQ_ORGAO: number;
        DSC_ORGAO: string;
        DSC_SIGLA: string | null;
        SEQ_ORGAO_PAI: number | null;
      }>>`
        WITH RECURSIVE hierarquia AS (
          SELECT 
            SEQ_ORGAO,
            DSC_ORGAO,
            DSC_SIGLA,
            SEQ_ORGAO_PAI,
            0 as nivel
          FROM corporativo.orgao
          WHERE SEQ_ORGAO = ${seqTribunal}
          
          UNION ALL
          
          SELECT 
            o.SEQ_ORGAO,
            o.DSC_ORGAO,
            o.DSC_SIGLA,
            o.SEQ_ORGAO_PAI,
            h.nivel + 1
          FROM corporativo.orgao o
          INNER JOIN hierarquia h ON o.SEQ_ORGAO_PAI = h.SEQ_ORGAO
          WHERE h.nivel < 5
        )
        SELECT * FROM hierarquia
        WHERE nivel > 0
        ORDER BY nivel, DSC_ORGAO
      `;

      return result.map(row => ({
        id: row.SEQ_ORGAO,
        descricao: row.DSC_ORGAO,
        sigla: row.DSC_SIGLA ?? undefined,
        orgaoPaiId: row.SEQ_ORGAO_PAI ?? undefined,
      }));
    } catch (error) {
      console.error('Erro ao listar órgãos:', error);
      return [];
    }
  }

  // ============================================================================
  // HELPERS PRIVADOS
  // ============================================================================

  private inferirEsfera(sigla: string, descricao: string): EsferaJustica {
    const s = sigla?.toUpperCase() ?? '';
    const d = descricao?.toUpperCase() ?? '';

    // Tribunais Superiores
    if (['STF', 'STJ', 'TST', 'TSE', 'STM', 'CNJ'].includes(s)) {
      return 'SUPERIOR';
    }

    // Por prefixo da sigla
    if (s.startsWith('TRF') || s.startsWith('JF')) return 'FEDERAL';
    if (s.startsWith('TRT') || s.startsWith('JT')) return 'TRABALHO';
    if (s.startsWith('TRE')) return 'ELEITORAL';
    if (s.startsWith('TJM') || d.includes('MILITAR')) return 'MILITAR';
    if (s.startsWith('TJ')) return 'ESTADUAL';

    // Por descrição
    if (d.includes('FEDERAL')) return 'FEDERAL';
    if (d.includes('TRABALHO')) return 'TRABALHO';
    if (d.includes('ELEITORAL')) return 'ELEITORAL';
    if (d.includes('MILITAR')) return 'MILITAR';

    // Default
    return 'ESTADUAL';
  }

  private inferirRegiao(uf: UF): Regiao {
    const regioes: Record<UF, Regiao> = {
      'AC': 'NORTE', 'AM': 'NORTE', 'AP': 'NORTE', 'PA': 'NORTE', 'RO': 'NORTE', 'RR': 'NORTE', 'TO': 'NORTE',
      'AL': 'NORDESTE', 'BA': 'NORDESTE', 'CE': 'NORDESTE', 'MA': 'NORDESTE', 'PB': 'NORDESTE', 
      'PE': 'NORDESTE', 'PI': 'NORDESTE', 'RN': 'NORDESTE', 'SE': 'NORDESTE',
      'DF': 'CENTRO_OESTE', 'GO': 'CENTRO_OESTE', 'MS': 'CENTRO_OESTE', 'MT': 'CENTRO_OESTE',
      'ES': 'SUDESTE', 'MG': 'SUDESTE', 'RJ': 'SUDESTE', 'SP': 'SUDESTE',
      'PR': 'SUL', 'RS': 'SUL', 'SC': 'SUL',
    };
    return regioes[uf] ?? 'SUDESTE';
  }
}

// ============================================================================
// IMPLEMENTAÇÃO VIA API REST (FUTURA)
// ============================================================================

export class CorporativoApiClient implements ICorporativoClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getUsuario(seqUsuario: number): Promise<UsuarioCorporativo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/usuarios/${seqUsuario}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar usuário via API:', error);
      return null;
    }
  }

  async getOrgao(seqOrgao: number): Promise<OrgaoCorporativo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/orgaos/${seqOrgao}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar órgão via API:', error);
      return null;
    }
  }

  async getTribunalByOrgao(seqOrgao: number): Promise<TribunalCorporativo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/orgaos/${seqOrgao}/tribunal`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar tribunal via API:', error);
      return null;
    }
  }

  async getContextoUsuario(seqUsuario: number, seqOrgao: number): Promise<ContextoUsuario | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/contexto?usuario=${seqUsuario}&orgao=${seqOrgao}`
      );
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar contexto via API:', error);
      return null;
    }
  }

  async listarTribunais(): Promise<TribunalCorporativo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tribunais`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Erro ao listar tribunais via API:', error);
      return [];
    }
  }

  async listarOrgaosTribunal(seqTribunal: number): Promise<OrgaoCorporativo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tribunais/${seqTribunal}/orgaos`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Erro ao listar órgãos via API:', error);
      return [];
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let clientInstance: ICorporativoClient | null = null;

/**
 * Obtém a instância do client do corporativo.
 * Configura automaticamente baseado nas variáveis de ambiente.
 */
export function getCorporativoClient(): ICorporativoClient {
  if (!clientInstance) {
    const apiUrl = process.env.CORPORATIVO_API_URL;
    
    if (apiUrl) {
      // Usar API REST se configurada
      clientInstance = new CorporativoApiClient(apiUrl);
      console.log('Corporativo: usando API REST');
    } else {
      // Usar acesso direto ao banco (padrão)
      clientInstance = new CorporativoDbClient();
      console.log('Corporativo: usando acesso direto ao banco');
    }
  }
  
  return clientInstance;
}
