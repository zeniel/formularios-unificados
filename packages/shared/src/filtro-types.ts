// =============================================================================
// TIPOS PARA FILTROS DE VISIBILIDADE
// =============================================================================

// Operadores disponíveis
export type OperadorFiltro =
  | 'IGUAL'
  | 'DIFERENTE'
  | 'MAIOR'
  | 'MENOR'
  | 'MAIOR_IGUAL'
  | 'MENOR_IGUAL'
  | 'EM'
  | 'NAO_EM'
  | 'CONTEM'
  | 'COMECA_COM'
  | 'TERMINA_COM'
  | 'VAZIO'
  | 'NAO_VAZIO';

// Lógica de combinação
export type LogicaFiltro = 'AND' | 'OR';

// Uma condição individual
export interface CondicaoFiltro {
  // Referência à pergunta (pelo COD_PERGUNTA ou SEQ_PERGUNTA)
  campo: string;              // COD_PERGUNTA da pergunta referenciada
  seqPergunta?: number;       // Alternativa: SEQ_PERGUNTA direto
  
  // Operador
  operador: OperadorFiltro;
  
  // Valor(es) para comparação
  valor?: string | number | boolean;  // Para operadores simples
  valores?: (string | number)[];       // Para EM, NAO_EM
}

// Grupo de condições (combinadas com AND ou OR)
export interface GrupoCondicoes {
  logica: LogicaFiltro;
  condicoes: CondicaoFiltro[];
}

// Filtro completo (pode ter grupos aninhados)
export interface FiltroVisibilidade {
  // Lógica entre grupos (OR por padrão - basta um grupo ser verdadeiro)
  logica: LogicaFiltro;
  grupos: GrupoCondicoes[];
}

// Filtro simplificado (apenas condições, sem aninhamento)
export interface FiltroSimples {
  logica: LogicaFiltro;
  condicoes: CondicaoFiltro[];
}

// O campo JSON_FILTRO_VISIBILIDADE aceita ambos formatos
export type FiltroVisibilidadeJSON = FiltroVisibilidade | FiltroSimples;


// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Verifica se é um filtro simples (sem grupos aninhados)
 */
export function isFiltroSimples(filtro: FiltroVisibilidadeJSON): filtro is FiltroSimples {
  return 'condicoes' in filtro && !('grupos' in filtro);
}

/**
 * Normaliza filtro para formato com grupos (facilita processamento)
 */
export function normalizarFiltro(filtro: FiltroVisibilidadeJSON): FiltroVisibilidade {
  if (isFiltroSimples(filtro)) {
    return {
      logica: 'AND', // Um único grupo, então AND ou OR tanto faz
      grupos: [
        {
          logica: filtro.logica,
          condicoes: filtro.condicoes,
        },
      ],
    };
  }
  return filtro;
}

/**
 * Valida estrutura do filtro
 */
export function validarFiltro(filtro: unknown): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (!filtro || typeof filtro !== 'object') {
    return { valido: false, erros: ['Filtro deve ser um objeto'] };
  }

  const f = filtro as Record<string, unknown>;

  // Verificar lógica
  if (!f.logica || !['AND', 'OR'].includes(f.logica as string)) {
    erros.push('Campo "logica" deve ser AND ou OR');
  }

  // Verificar se tem condicoes ou grupos
  if (!f.condicoes && !f.grupos) {
    erros.push('Filtro deve ter "condicoes" ou "grupos"');
  }

  // Validar condições
  if (f.condicoes && Array.isArray(f.condicoes)) {
    f.condicoes.forEach((cond: unknown, idx: number) => {
      const errosCond = validarCondicao(cond, idx);
      erros.push(...errosCond);
    });
  }

  // Validar grupos
  if (f.grupos && Array.isArray(f.grupos)) {
    f.grupos.forEach((grupo: unknown, idx: number) => {
      if (!grupo || typeof grupo !== 'object') {
        erros.push(`Grupo ${idx}: deve ser um objeto`);
        return;
      }
      const g = grupo as Record<string, unknown>;
      if (!g.logica || !['AND', 'OR'].includes(g.logica as string)) {
        erros.push(`Grupo ${idx}: "logica" deve ser AND ou OR`);
      }
      if (!g.condicoes || !Array.isArray(g.condicoes)) {
        erros.push(`Grupo ${idx}: deve ter array "condicoes"`);
      } else {
        g.condicoes.forEach((cond: unknown, condIdx: number) => {
          const errosCond = validarCondicao(cond, condIdx, idx);
          erros.push(...errosCond);
        });
      }
    });
  }

  return { valido: erros.length === 0, erros };
}

function validarCondicao(cond: unknown, idx: number, grupoIdx?: number): string[] {
  const prefix = grupoIdx !== undefined ? `Grupo ${grupoIdx}, Condição ${idx}` : `Condição ${idx}`;
  const erros: string[] = [];

  if (!cond || typeof cond !== 'object') {
    return [`${prefix}: deve ser um objeto`];
  }

  const c = cond as Record<string, unknown>;

  // Deve ter campo ou seqPergunta
  if (!c.campo && !c.seqPergunta) {
    erros.push(`${prefix}: deve ter "campo" ou "seqPergunta"`);
  }

  // Deve ter operador
  if (!c.operador) {
    erros.push(`${prefix}: deve ter "operador"`);
  }

  return erros;
}
