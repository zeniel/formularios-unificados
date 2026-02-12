// src/lib/types/questionario.ts
// Tipos do domínio de questionários

// Status de publicação (RASCUNHO = editável, PUBLICADO = imutável)
export type StatusPublicacao = 'RASCUNHO' | 'PUBLICADO';

// Escopo de resposta
export type EscopoResposta = 'TRIBUNAL' | 'ORGAO' | 'INDIVIDUAL';

// Tipos de formato de resposta
export type CodigoFormatoResposta =
  | 1   // Texto
  | 2   // Moeda
  | 3   // Data
  | 4   // Sim/Não
  | 5   // Numérico
  | 7   // Multi-resposta
  | 8   // Percentual
  | 9   // Upload
  | 10  // Sim/Não - Resposta
  | 11; // Lista para escolha única

// ============================================================================
// DTOs de leitura
// ============================================================================

export interface QuestionarioResumo {
  SEQ_QUESTIONARIO: number;
  NOM_QUESTIONARIO: string;
  DSC_STATUS: StatusPublicacao;
  NUM_VERSAO: number;
  SEQ_QUESTIONARIO_BASE: number | null;
  DAT_CRIACAO_QUESTIONARIO: Date;
  DAT_PUBLICACAO: Date | null;
  QTD_PERGUNTAS: number;
  QTD_RESPOSTAS: number;
  COD_ESCOPO_RESPOSTA: EscopoResposta;
}

export interface QuestionarioCompleto extends QuestionarioResumo {
  DSC_QUESTIONARIO: string;
  NUM_MES_LIMITE: number;
  NUM_DIA_LIMITE: number | null;
  DSC_OBSERVACAO_QUESTIONARIO: string | null;
  DSC_TIPO_PERIODICIDADE: string;
  SEQ_ORGAO_ESCOPO: number | null;
  QTD_CATEGORIAS: number;
  categorias: CategoriaGrupo[];
}

export interface CategoriaGrupo {
  SEQ_CATEGORIA_PERGUNTA: number | null;
  DSC_CATEGORIA_PERGUNTA: string;
  NUM_ORDEM: number;
  perguntas: PerguntaResumo[];
}

export interface PerguntaResumo {
  SEQ_PERGUNTA: number;
  DSC_PERGUNTA: string;
  COD_PERGUNTA: string | null;
  TXT_GLOSSARIO: string | null;
  DSC_STATUS: StatusPublicacao;
  NUM_VERSAO: number;
  NUM_ORDEM: number;
  SEQ_PERGUNTA_BASE: number | null;
  SEQ_CATEGORIA_PERGUNTA: number | null;
  DSC_CATEGORIA_PERGUNTA: string | null;
  COD_TIPO_FORMATO_RESPOSTA: CodigoFormatoResposta;
  DSC_TIPO_FORMATO_RESPOSTA: string;
  QTD_RESPOSTAS: number;
}

export interface PerguntaCompleta extends PerguntaResumo {
  DSC_COMPLEMENTO_PERGUNTA: string | null;
  TXT_GLOSSARIO: string | null;
  TXT_JSON_ARRAY_RESPOSTAS: string | null;
  opcoes: string[]; // Parseado de TXT_JSON_ARRAY_RESPOSTAS
  SEQ_TIPO_FORMATO_RESPOSTA: number;
  SEQ_TIPO_VARIAVEL_PERGUNTA: number;
  SEQ_TIPO_PERIODICIDADE_PERGUNTA: number;
  DSC_TIPO_PERIODICIDADE: string;
  DSC_TIPO_VARIAVEL: string;
  DAT_CRIACAO_PERGUNTA: Date;
  DAT_PUBLICACAO: Date | null;
}

// Lookup de formatos de resposta
export interface FormatoResposta {
  SEQ_TIPO_FORMATO_RESPOSTA: number;
  COD_TIPO_FORMATO_RESPOSTA: number;
  DSC_TIPO_FORMATO_RESPOSTA: string;
}

// Lookup de variáveis de pergunta
export interface VariavelPergunta {
  SEQ_TIPO_VARIAVEL_PERGUNTA: number;
  DSC_TIPO_VARIAVEL_PERGUNTA: string | null;
}

// Payload do reorder (drag-and-drop)
export interface ReordenarPerguntaItem {
  SEQ_PERGUNTA: number;
  NUM_ORDEM: number;
  SEQ_CATEGORIA_PERGUNTA: number | null;
}

export interface CategoriaResumo {
  SEQ_CATEGORIA_PERGUNTA: number;
  DSC_CATEGORIA_PERGUNTA: string;
  NUM_ORDEM: number;
  DSC_STATUS: StatusPublicacao;
  NUM_VERSAO: number;
  SEQ_CATEGORIA_BASE: number | null;
  SEQ_CATEGORIA_PERGUNTA_PAI: number | null;
  DSC_CATEGORIA_PAI: string | null;
  QTD_PERGUNTAS: number;
  QTD_SUBCATEGORIAS: number;
}

// ============================================================================
// DTOs de escrita
// ============================================================================

export interface CriarQuestionarioInput {
  NOM_QUESTIONARIO: string;
  DSC_QUESTIONARIO: string;
  SEQ_TIPO_PERIODICIDADE_PERGUNTA: number;
  NUM_MES_LIMITE: number;
  NUM_DIA_LIMITE?: number;
  DSC_OBSERVACAO_QUESTIONARIO?: string;
  COD_ESCOPO_RESPOSTA?: EscopoResposta;
  SEQ_ORGAO_ESCOPO?: number; // Para escopo ORGAO
}

export interface EditarQuestionarioInput {
  NOM_QUESTIONARIO?: string;
  DSC_QUESTIONARIO?: string;
  NUM_MES_LIMITE?: number;
  NUM_DIA_LIMITE?: number;
  DSC_OBSERVACAO_QUESTIONARIO?: string;
}

export interface CriarPerguntaInput {
  SEQ_QUESTIONARIO: number;
  DSC_PERGUNTA: string;
  SEQ_TIPO_FORMATO_RESPOSTA: number;
  SEQ_TIPO_PERIODICIDADE_PERGUNTA: number;
  SEQ_TIPO_VARIAVEL_PERGUNTA: number;
  SEQ_CATEGORIA_PERGUNTA?: number;
  COD_PERGUNTA?: string;
  DSC_COMPLEMENTO_PERGUNTA?: string;
  TXT_GLOSSARIO?: string;
  opcoes?: string[]; // Será convertido para TXT_JSON_ARRAY_RESPOSTAS
  NUM_ORDEM?: number;
}

export interface EditarPerguntaInput {
  DSC_PERGUNTA?: string;
  COD_PERGUNTA?: string;
  DSC_COMPLEMENTO_PERGUNTA?: string;
  TXT_GLOSSARIO?: string;
  opcoes?: string[];
  SEQ_CATEGORIA_PERGUNTA?: number;
  NUM_ORDEM?: number;
}

export interface CriarCategoriaInput {
  DSC_CATEGORIA_PERGUNTA: string;
  SEQ_CATEGORIA_PERGUNTA_PAI?: number;
  NUM_ORDEM?: number;
}

export interface EditarCategoriaInput {
  DSC_CATEGORIA_PERGUNTA?: string;
  NUM_ORDEM?: number;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parseia as opções de resposta do campo TXT_JSON_ARRAY_RESPOSTAS
 * Formato: "opcao1;opcao2;opcao3"
 */
export function parseOpcoes(txt: string | null | undefined): string[] {
  if (!txt) return [];
  return txt.split(';').map(o => o.trim()).filter(Boolean);
}

/**
 * Serializa as opções para o formato do banco
 */
export function serializeOpcoes(opcoes: string[]): string {
  return opcoes.map(o => o.trim()).filter(Boolean).join(';');
}

/**
 * Verifica se uma entidade é editável (RASCUNHO = editável)
 */
export function isEditavel(status: StatusPublicacao): boolean {
  return status === 'RASCUNHO';
}

/**
 * Calcula o SEQ_*_RAIZ (para agregação de versões)
 */
export function calcularRaiz(seq: number, seqBase: number | null): number {
  return seqBase ?? seq;
}
