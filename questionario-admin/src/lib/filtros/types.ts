// src/lib/filtros/types.ts
// Tipos do módulo de filtros

/**
 * Tipos de filtro disponíveis
 */
export type CodigoTipoFiltro =
  | 'ESFERA_JUSTICA'
  | 'UF'
  | 'TIPO_ORGAO'
  | 'ORGAO_ID'
  | 'TRIBUNAL_ID'
  | 'PERFIL_CORPORATIVO'
  | 'REGIAO'
  | 'PORTE_TRIBUNAL'
  | string; // Extensível

/**
 * Operadores de comparação disponíveis
 */
export type CodigoOperador =
  | 'IGUAL'
  | 'DIFERENTE'
  | 'CONTEM'
  | 'NAO_CONTEM'
  | 'MAIOR'
  | 'MENOR'
  | 'MAIOR_IGUAL'
  | 'MENOR_IGUAL'
  | 'COMECA_COM'
  | 'TERMINA_COM'
  | 'EXISTE'
  | 'NAO_EXISTE';

/**
 * Tipo de filtro (para cadastro)
 */
export interface TipoFiltro {
  id: number;
  codigo: CodigoTipoFiltro;
  descricao: string;
  campoContexto: string;
  tipoDado: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE';
  valoresPossiveis?: string[];
}

/**
 * Operador de filtro (para cadastro)
 */
export interface OperadorFiltro {
  id: number;
  codigo: CodigoOperador;
  descricao: string;
  simbolo?: string;
  requerLista: boolean;
}

/**
 * Filtro aplicado a uma pergunta (para interface)
 */
export interface FiltroPergunta {
  id: number;
  perguntaId: number;
  tipoFiltro: TipoFiltro;
  operador: OperadorFiltro;
  valores: unknown[];
  grupo: number;
  observacao?: string;
}

/**
 * Grupo de filtros (para interface)
 */
export interface GrupoFiltros {
  numero: number;
  descricao?: string;
  logicaProxima: 'AND' | 'OR';
  filtros: FiltroPergunta[];
}

/**
 * Input para criar filtro
 */
export interface CriarFiltroInput {
  perguntaId: number;
  tipoFiltroId: number;
  operadorId: number;
  valores: unknown[];
  grupo?: number;
  observacao?: string;
}

/**
 * Resumo de filtros de uma pergunta (para listagem)
 */
export interface ResumoFiltrosPergunta {
  perguntaId: number;
  totalFiltros: number;
  totalGrupos: number;
  resumoTexto: string; // Ex: "Estadual (SP, RJ) ou Federal"
}
