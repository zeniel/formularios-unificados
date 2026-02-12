// src/lib/filtros/repository.ts
// Repositório para carregar filtros do banco de dados

import { prisma } from '@/lib/db';
import { FiltroCarregado } from './avaliador';

/**
 * Carrega todos os filtros ativos de uma pergunta
 */
export async function carregarFiltrosPergunta(
  seqPergunta: number
): Promise<FiltroCarregado[]> {
  try {
    const result = await prisma.$queryRaw<FiltroCarregado[]>`
      SELECT 
        pf.SEQ_PERGUNTA_FILTRO,
        pf.SEQ_PERGUNTA,
        pf.NUM_GRUPO,
        tfp.COD_TIPO_FILTRO,
        tfp.DSC_CAMPO_CONTEXTO,
        tof.COD_OPERADOR,
        pf.TXT_VALORES
      FROM pergunta_filtro pf
      JOIN tipo_filtro_pergunta tfp ON tfp.SEQ_TIPO_FILTRO_PERGUNTA = pf.SEQ_TIPO_FILTRO_PERGUNTA
      JOIN tipo_operador_filtro tof ON tof.SEQ_TIPO_OPERADOR_FILTRO = pf.SEQ_TIPO_OPERADOR_FILTRO
      WHERE pf.SEQ_PERGUNTA = ${seqPergunta}
        AND pf.FLG_ATIVO = 'S'
        AND tfp.FLG_ATIVO = 'S'
      ORDER BY pf.NUM_GRUPO, pf.SEQ_PERGUNTA_FILTRO
    `;

    return result;
  } catch (error) {
    console.error('Erro ao carregar filtros da pergunta:', error);
    return [];
  }
}

/**
 * Carrega filtros de todas as perguntas de um questionário
 */
export async function carregarFiltrosQuestionario(
  seqQuestionario: number
): Promise<Map<number, FiltroCarregado[]>> {
  try {
    const result = await prisma.$queryRaw<FiltroCarregado[]>`
      SELECT 
        pf.SEQ_PERGUNTA_FILTRO,
        pf.SEQ_PERGUNTA,
        pf.NUM_GRUPO,
        tfp.COD_TIPO_FILTRO,
        tfp.DSC_CAMPO_CONTEXTO,
        tof.COD_OPERADOR,
        pf.TXT_VALORES
      FROM pergunta_filtro pf
      JOIN pergunta p ON p.SEQ_PERGUNTA = pf.SEQ_PERGUNTA
      JOIN tipo_filtro_pergunta tfp ON tfp.SEQ_TIPO_FILTRO_PERGUNTA = pf.SEQ_TIPO_FILTRO_PERGUNTA
      JOIN tipo_operador_filtro tof ON tof.SEQ_TIPO_OPERADOR_FILTRO = pf.SEQ_TIPO_OPERADOR_FILTRO
      WHERE p.SEQ_QUESTIONARIO = ${seqQuestionario}
        AND pf.FLG_ATIVO = 'S'
        AND tfp.FLG_ATIVO = 'S'
      ORDER BY pf.SEQ_PERGUNTA, pf.NUM_GRUPO, pf.SEQ_PERGUNTA_FILTRO
    `;

    // Agrupar por pergunta
    const filtrosPorPergunta = new Map<number, FiltroCarregado[]>();
    
    for (const filtro of result) {
      const lista = filtrosPorPergunta.get(filtro.SEQ_PERGUNTA) || [];
      lista.push(filtro);
      filtrosPorPergunta.set(filtro.SEQ_PERGUNTA, lista);
    }

    return filtrosPorPergunta;
  } catch (error) {
    console.error('Erro ao carregar filtros do questionário:', error);
    return new Map();
  }
}

/**
 * Carrega filtros de múltiplas perguntas
 */
export async function carregarFiltrosPerguntas(
  seqPerguntas: number[]
): Promise<Map<number, FiltroCarregado[]>> {
  if (seqPerguntas.length === 0) {
    return new Map();
  }

  try {
    const result = await prisma.$queryRaw<FiltroCarregado[]>`
      SELECT 
        pf.SEQ_PERGUNTA_FILTRO,
        pf.SEQ_PERGUNTA,
        pf.NUM_GRUPO,
        tfp.COD_TIPO_FILTRO,
        tfp.DSC_CAMPO_CONTEXTO,
        tof.COD_OPERADOR,
        pf.TXT_VALORES
      FROM pergunta_filtro pf
      JOIN tipo_filtro_pergunta tfp ON tfp.SEQ_TIPO_FILTRO_PERGUNTA = pf.SEQ_TIPO_FILTRO_PERGUNTA
      JOIN tipo_operador_filtro tof ON tof.SEQ_TIPO_OPERADOR_FILTRO = pf.SEQ_TIPO_OPERADOR_FILTRO
      WHERE pf.SEQ_PERGUNTA IN (${seqPerguntas.join(',')})
        AND pf.FLG_ATIVO = 'S'
        AND tfp.FLG_ATIVO = 'S'
      ORDER BY pf.SEQ_PERGUNTA, pf.NUM_GRUPO, pf.SEQ_PERGUNTA_FILTRO
    `;

    // Agrupar por pergunta
    const filtrosPorPergunta = new Map<number, FiltroCarregado[]>();
    
    for (const filtro of result) {
      const lista = filtrosPorPergunta.get(filtro.SEQ_PERGUNTA) || [];
      lista.push(filtro);
      filtrosPorPergunta.set(filtro.SEQ_PERGUNTA, lista);
    }

    return filtrosPorPergunta;
  } catch (error) {
    console.error('Erro ao carregar filtros:', error);
    return new Map();
  }
}

/**
 * Carrega tipos de filtro disponíveis
 */
export async function carregarTiposFiltro(): Promise<Array<{
  SEQ_TIPO_FILTRO_PERGUNTA: number;
  COD_TIPO_FILTRO: string;
  DSC_TIPO_FILTRO: string;
  DSC_CAMPO_CONTEXTO: string;
  DSC_TIPO_DADO: string;
  TXT_VALORES_POSSIVEIS: string | null;
}>> {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        SEQ_TIPO_FILTRO_PERGUNTA,
        COD_TIPO_FILTRO,
        DSC_TIPO_FILTRO,
        DSC_CAMPO_CONTEXTO,
        DSC_TIPO_DADO,
        TXT_VALORES_POSSIVEIS
      FROM tipo_filtro_pergunta
      WHERE FLG_ATIVO = 'S'
      ORDER BY NUM_ORDEM, DSC_TIPO_FILTRO
    `;

    return result as any;
  } catch (error) {
    console.error('Erro ao carregar tipos de filtro:', error);
    return [];
  }
}

/**
 * Carrega operadores de filtro disponíveis
 */
export async function carregarOperadoresFiltro(): Promise<Array<{
  SEQ_TIPO_OPERADOR_FILTRO: number;
  COD_OPERADOR: string;
  DSC_OPERADOR: string;
  DSC_SIMBOLO: string | null;
  FLG_REQUER_LISTA: string;
}>> {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        SEQ_TIPO_OPERADOR_FILTRO,
        COD_OPERADOR,
        DSC_OPERADOR,
        DSC_SIMBOLO,
        FLG_REQUER_LISTA
      FROM tipo_operador_filtro
      ORDER BY COD_OPERADOR
    `;

    return result as any;
  } catch (error) {
    console.error('Erro ao carregar operadores:', error);
    return [];
  }
}

/**
 * Adiciona um filtro a uma pergunta
 */
export async function adicionarFiltro(dados: {
  seqPergunta: number;
  seqTipoFiltro: number;
  seqTipoOperador: number;
  valores: unknown[];
  numGrupo?: number;
  observacao?: string;
  usuario: string;
}): Promise<number> {
  const result = await prisma.$executeRaw`
    INSERT INTO pergunta_filtro (
      SEQ_PERGUNTA,
      SEQ_TIPO_FILTRO_PERGUNTA,
      SEQ_TIPO_OPERADOR_FILTRO,
      TXT_VALORES,
      NUM_GRUPO,
      DSC_OBSERVACAO,
      FLG_ATIVO,
      USU_INCLUSAO
    ) VALUES (
      ${dados.seqPergunta},
      ${dados.seqTipoFiltro},
      ${dados.seqTipoOperador},
      ${JSON.stringify(dados.valores)},
      ${dados.numGrupo ?? 1},
      ${dados.observacao ?? null},
      'S',
      ${dados.usuario}
    )
  `;

  return result;
}

/**
 * Remove (desativa) um filtro
 */
export async function removerFiltro(seqPerguntaFiltro: number): Promise<void> {
  await prisma.$executeRaw`
    UPDATE pergunta_filtro 
    SET FLG_ATIVO = 'N'
    WHERE SEQ_PERGUNTA_FILTRO = ${seqPerguntaFiltro}
  `;
}
