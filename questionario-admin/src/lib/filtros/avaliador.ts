// src/lib/filtros/avaliador.ts
// Serviço para avaliar filtros de perguntas contra o contexto do usuário

import { ContextoUsuario } from '@/lib/corporativo/types';

/**
 * Estrutura de um filtro carregado do banco
 */
export interface FiltroCarregado {
  SEQ_PERGUNTA_FILTRO: number;
  SEQ_PERGUNTA: number;
  NUM_GRUPO: number;
  COD_TIPO_FILTRO: string;
  DSC_CAMPO_CONTEXTO: string;
  COD_OPERADOR: string;
  TXT_VALORES: string; // JSON array
}

/**
 * Resultado da avaliação de filtros de uma pergunta
 */
export interface ResultadoAvaliacao {
  perguntaId: number;
  exibir: boolean;
  motivoOcultar?: string;
}

/**
 * Obtém o valor de um campo no contexto do usuário usando dot notation
 * Ex: "tribunal.esfera" -> contexto.tribunal.esfera
 */
function getValorContexto(contexto: ContextoUsuario, caminho: string): unknown {
  const partes = caminho.split('.');
  let valor: unknown = contexto;

  for (const parte of partes) {
    if (valor === null || valor === undefined) return undefined;
    if (typeof valor !== 'object') return undefined;
    valor = (valor as Record<string, unknown>)[parte];
  }

  return valor;
}

/**
 * Parseia os valores do filtro (JSON array)
 */
function parseValoresFiltro(txtValores: string): unknown[] {
  try {
    const parsed = JSON.parse(txtValores);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Se não for JSON válido, tratar como valor único
    return [txtValores];
  }
}

/**
 * Avalia um único filtro contra o contexto
 */
function avaliarFiltro(
  filtro: FiltroCarregado, 
  contexto: ContextoUsuario
): boolean {
  const valorContexto = getValorContexto(contexto, filtro.DSC_CAMPO_CONTEXTO);
  const valoresFiltro = parseValoresFiltro(filtro.TXT_VALORES);

  // Se o valor no contexto não existe
  if (valorContexto === undefined || valorContexto === null) {
    switch (filtro.COD_OPERADOR) {
      case 'NAO_EXISTE':
      case 'NAO_CONTEM':
        return true;
      case 'EXISTE':
      case 'IGUAL':
      case 'CONTEM':
        return false;
      default:
        return false;
    }
  }

  // Normalizar para comparação
  const valorNormalizado = String(valorContexto).toUpperCase().trim();
  const valoresNormalizados = valoresFiltro.map(v => String(v).toUpperCase().trim());

  switch (filtro.COD_OPERADOR) {
    case 'IGUAL':
      return valoresNormalizados.includes(valorNormalizado);

    case 'DIFERENTE':
      return !valoresNormalizados.includes(valorNormalizado);

    case 'CONTEM':
      return valoresNormalizados.includes(valorNormalizado);

    case 'NAO_CONTEM':
      return !valoresNormalizados.includes(valorNormalizado);

    case 'MAIOR':
      return Number(valorContexto) > Number(valoresFiltro[0]);

    case 'MENOR':
      return Number(valorContexto) < Number(valoresFiltro[0]);

    case 'MAIOR_IGUAL':
      return Number(valorContexto) >= Number(valoresFiltro[0]);

    case 'MENOR_IGUAL':
      return Number(valorContexto) <= Number(valoresFiltro[0]);

    case 'COMECA_COM':
      return valorNormalizado.startsWith(valoresNormalizados[0]);

    case 'TERMINA_COM':
      return valorNormalizado.endsWith(valoresNormalizados[0]);

    case 'EXISTE':
      return true; // Já verificamos acima que existe

    case 'NAO_EXISTE':
      return false; // Já verificamos acima que existe

    default:
      console.warn(`Operador desconhecido: ${filtro.COD_OPERADOR}`);
      return true; // Na dúvida, exibe
  }
}

/**
 * Agrupa filtros por grupo
 */
function agruparFiltros(filtros: FiltroCarregado[]): Map<number, FiltroCarregado[]> {
  const grupos = new Map<number, FiltroCarregado[]>();
  
  for (const filtro of filtros) {
    const grupo = grupos.get(filtro.NUM_GRUPO) || [];
    grupo.push(filtro);
    grupos.set(filtro.NUM_GRUPO, grupo);
  }
  
  return grupos;
}

/**
 * Avalia todos os filtros de uma pergunta
 * 
 * Lógica:
 * - Filtros no MESMO grupo: combinados com AND
 * - DIFERENTES grupos: combinados com OR
 * 
 * Exemplo:
 *   Grupo 1: ESFERA = 'ESTADUAL' AND UF = 'SP'
 *   Grupo 2: ESFERA = 'FEDERAL'
 *   Resultado: (ESTADUAL AND SP) OR (FEDERAL)
 */
export function avaliarFiltrosPergunta(
  filtros: FiltroCarregado[],
  contexto: ContextoUsuario
): boolean {
  // Se não há filtros, exibe a pergunta
  if (!filtros || filtros.length === 0) {
    return true;
  }

  // Agrupar filtros
  const grupos = agruparFiltros(filtros);

  // Avaliar cada grupo (AND interno)
  const resultadosGrupos: boolean[] = [];

  for (const [grupoNum, filtrosGrupo] of grupos) {
    // Todos os filtros do grupo devem passar (AND)
    const grupoPassou = filtrosGrupo.every(filtro => 
      avaliarFiltro(filtro, contexto)
    );
    resultadosGrupos.push(grupoPassou);
  }

  // Combinar grupos com OR
  // Se QUALQUER grupo passou, a pergunta é exibida
  return resultadosGrupos.some(resultado => resultado);
}

/**
 * Avalia filtros para múltiplas perguntas de uma vez
 */
export function avaliarFiltrosPerguntas(
  perguntasComFiltros: Map<number, FiltroCarregado[]>,
  contexto: ContextoUsuario
): Map<number, boolean> {
  const resultados = new Map<number, boolean>();

  for (const [perguntaId, filtros] of perguntasComFiltros) {
    resultados.set(perguntaId, avaliarFiltrosPergunta(filtros, contexto));
  }

  return resultados;
}

/**
 * Filtra lista de perguntas baseado no contexto
 */
export function filtrarPerguntas<T extends { SEQ_PERGUNTA: number }>(
  perguntas: T[],
  filtrosPorPergunta: Map<number, FiltroCarregado[]>,
  contexto: ContextoUsuario
): T[] {
  return perguntas.filter(pergunta => {
    const filtros = filtrosPorPergunta.get(pergunta.SEQ_PERGUNTA) || [];
    return avaliarFiltrosPergunta(filtros, contexto);
  });
}
