// =============================================================================
// AVALIADOR DE FILTROS DE VISIBILIDADE
// =============================================================================
//
// Recebe um filtro JSON e as respostas disponíveis, retorna se a pergunta
// deve ser exibida ou não.
//
// =============================================================================

import {
  FiltroVisibilidadeJSON,
  CondicaoFiltro,
  GrupoCondicoes,
  OperadorFiltro,
  normalizarFiltro,
} from './filtro-types';

// Mapa de respostas: COD_PERGUNTA ou SEQ_PERGUNTA -> valor
export type MapaRespostas = Map<string, string | number | boolean | null>;

// =============================================================================
// AVALIADOR PRINCIPAL
// =============================================================================

/**
 * Avalia se uma pergunta deve ser exibida baseado no filtro e respostas
 * 
 * @param filtroJson - O filtro em formato JSON (do campo JSON_FILTRO_VISIBILIDADE)
 * @param respostas - Mapa com as respostas das perguntas (incluindo ocultas/EL)
 * @returns true se a pergunta deve ser exibida
 */
export function avaliarFiltro(
  filtroJson: FiltroVisibilidadeJSON | null | undefined,
  respostas: MapaRespostas
): boolean {
  // Sem filtro = sempre exibir
  if (!filtroJson) {
    return true;
  }

  // Normalizar para formato com grupos
  const filtro = normalizarFiltro(filtroJson);

  // Avaliar grupos com lógica OR ou AND entre eles
  if (filtro.logica === 'OR') {
    // Pelo menos um grupo deve ser verdadeiro
    return filtro.grupos.some(grupo => avaliarGrupo(grupo, respostas));
  } else {
    // Todos os grupos devem ser verdadeiros
    return filtro.grupos.every(grupo => avaliarGrupo(grupo, respostas));
  }
}

/**
 * Avalia um grupo de condições
 */
function avaliarGrupo(grupo: GrupoCondicoes, respostas: MapaRespostas): boolean {
  if (grupo.logica === 'AND') {
    // Todas as condições devem ser verdadeiras
    return grupo.condicoes.every(cond => avaliarCondicao(cond, respostas));
  } else {
    // Pelo menos uma condição deve ser verdadeira
    return grupo.condicoes.some(cond => avaliarCondicao(cond, respostas));
  }
}

/**
 * Avalia uma condição individual
 */
function avaliarCondicao(cond: CondicaoFiltro, respostas: MapaRespostas): boolean {
  // Obter valor da resposta referenciada
  const chave = cond.seqPergunta 
    ? `#${cond.seqPergunta}` 
    : cond.campo;
  
  // Tentar encontrar a resposta (por código ou por SEQ)
  let valorResposta = respostas.get(chave);
  
  // Se não encontrou por código, tentar variações
  if (valorResposta === undefined && cond.campo) {
    // Tentar com prefixo EL_ (para perguntas ocultas)
    valorResposta = respostas.get(`EL_${cond.campo}`);
    
    // Tentar sem prefixo EL_
    if (valorResposta === undefined && cond.campo.startsWith('EL_')) {
      valorResposta = respostas.get(cond.campo.substring(3));
    }
  }

  // Avaliar operador
  return avaliarOperador(cond.operador, valorResposta, cond.valor, cond.valores);
}

/**
 * Avalia um operador específico
 */
function avaliarOperador(
  operador: OperadorFiltro,
  valorCampo: string | number | boolean | null | undefined,
  valorEsperado?: string | number | boolean,
  valoresEsperados?: (string | number)[]
): boolean {
  
  switch (operador) {
    case 'IGUAL':
      return String(valorCampo) === String(valorEsperado);
    
    case 'DIFERENTE':
      return String(valorCampo) !== String(valorEsperado);
    
    case 'MAIOR':
      return Number(valorCampo) > Number(valorEsperado);
    
    case 'MENOR':
      return Number(valorCampo) < Number(valorEsperado);
    
    case 'MAIOR_IGUAL':
      return Number(valorCampo) >= Number(valorEsperado);
    
    case 'MENOR_IGUAL':
      return Number(valorCampo) <= Number(valorEsperado);
    
    case 'EM':
      if (!valoresEsperados) return false;
      return valoresEsperados.map(String).includes(String(valorCampo));
    
    case 'NAO_EM':
      if (!valoresEsperados) return true;
      return !valoresEsperados.map(String).includes(String(valorCampo));
    
    case 'CONTEM':
      if (valorCampo == null || valorEsperado == null) return false;
      return String(valorCampo).toLowerCase().includes(String(valorEsperado).toLowerCase());
    
    case 'COMECA_COM':
      if (valorCampo == null || valorEsperado == null) return false;
      return String(valorCampo).toLowerCase().startsWith(String(valorEsperado).toLowerCase());
    
    case 'TERMINA_COM':
      if (valorCampo == null || valorEsperado == null) return false;
      return String(valorCampo).toLowerCase().endsWith(String(valorEsperado).toLowerCase());
    
    case 'VAZIO':
      return valorCampo == null || valorCampo === '' || valorCampo === undefined;
    
    case 'NAO_VAZIO':
      return valorCampo != null && valorCampo !== '' && valorCampo !== undefined;
    
    default:
      console.warn(`Operador desconhecido: ${operador}`);
      return false;
  }
}
