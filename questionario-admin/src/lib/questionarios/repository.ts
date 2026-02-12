// src/lib/questionarios/repository.ts
// Camada de dados para CRUD de questionários
//
// IMPORTANTE: O vínculo pergunta ↔ questionário é definido pela tabela
// questionario_pergunta (com FLG_ATIVO = 'S'), NÃO pelo campo direto
// SEQ_QUESTIONARIO em pergunta (que pode não estar preenchido no legado).

import { prisma } from '@/lib/db';
import type {
  QuestionarioResumo,
  QuestionarioCompleto,
  CriarQuestionarioInput,
  EditarQuestionarioInput,
  CriarPerguntaInput,
  EditarPerguntaInput,
  StatusPublicacao,
  PerguntaResumo,
  PerguntaCompleta,
  CategoriaGrupo,
  FormatoResposta,
  VariavelPergunta,
  ReordenarPerguntaItem,
} from '@/lib/types/questionario';
import { parseOpcoes, serializeOpcoes } from '@/lib/types/questionario';

// ============================================================================
// Tipos auxiliares
// ============================================================================

export interface FiltrosListagem {
  busca?: string;
  status?: StatusPublicacao;
  pagina?: number;
  porPagina?: number;
}

export interface ResultadoPaginado<T> {
  dados: T[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export interface Periodicidade {
  SEQ_TIPO_PERIODICIDADE_PERGUNTA: number;
  DSC_TIPO_PERIODICIDADE_PERGUNTA: string;
}

export interface Escopo {
  SEQ_TIPO_ESCOPO_RESPOSTA: number;
  COD_TIPO_ESCOPO: string;
  DSC_TIPO_ESCOPO: string;
}

// ============================================================================
// Helper: buscar perguntas de um questionário via questionario_pergunta
// ============================================================================

async function buscarPerguntasDoQuestionario(seqQuestionario: number) {
  const vinculos = await prisma.questionarioPergunta.findMany({
    where: {
      SEQ_QUESTIONARIO: seqQuestionario,
      FLG_ATIVO: 'S',
    },
    select: { SEQ_PERGUNTA: true },
  });

  if (vinculos.length === 0) return [];

  const seqPerguntas = vinculos.map(v => v.SEQ_PERGUNTA);

  return prisma.pergunta.findMany({
    where: { SEQ_PERGUNTA: { in: seqPerguntas } },
    orderBy: { NUM_ORDEM: 'asc' },
    include: {
      tipoFormato: true,
      categoria: true,
      _count: { select: { respostas: true } },
    },
  });
}

async function contarPerguntasDoQuestionario(seqQuestionario: number): Promise<number> {
  return prisma.questionarioPergunta.count({
    where: {
      SEQ_QUESTIONARIO: seqQuestionario,
      FLG_ATIVO: 'S',
    },
  });
}

// ============================================================================
// Listagem
// ============================================================================

export async function listarQuestionarios(
  filtros: FiltrosListagem = {}
): Promise<ResultadoPaginado<QuestionarioResumo>> {
  const { busca, status, pagina = 1, porPagina = 20 } = filtros;
  const skip = (pagina - 1) * porPagina;

  const where: Record<string, unknown> = {};

  if (status) {
    where.DSC_STATUS = status;
  }

  if (busca) {
    where.NOM_QUESTIONARIO = { contains: busca };
  }

  const [questionarios, total] = await Promise.all([
    prisma.questionario.findMany({
      where,
      include: {
        periodicidade: true,
        tipoEscopo: true,
        _count: {
          select: {
            respostas: true,
            questionarioPergunta: true,
          },
        },
        questionarioPergunta: {
          where: { FLG_ATIVO: 'S' },
          select: { SEQ_PERGUNTA: true },
        },
      },
      orderBy: [
        { DAT_CRIACAO_QUESTIONARIO: 'desc' },
      ],
      skip,
      take: porPagina,
    }),
    prisma.questionario.count({ where }),
  ]);

  const dados: QuestionarioResumo[] = questionarios.map(q => ({
    SEQ_QUESTIONARIO: q.SEQ_QUESTIONARIO,
    NOM_QUESTIONARIO: q.NOM_QUESTIONARIO,
    DSC_STATUS: q.DSC_STATUS as StatusPublicacao,
    NUM_VERSAO: q.NUM_VERSAO,
    SEQ_QUESTIONARIO_BASE: q.SEQ_QUESTIONARIO_BASE,
    DAT_CRIACAO_QUESTIONARIO: q.DAT_CRIACAO_QUESTIONARIO,
    DAT_PUBLICACAO: q.DAT_PUBLICACAO,
    QTD_PERGUNTAS: q.questionarioPergunta.length,
    QTD_RESPOSTAS: q._count.respostas,
    COD_ESCOPO_RESPOSTA: q.tipoEscopo?.COD_TIPO_ESCOPO as QuestionarioResumo['COD_ESCOPO_RESPOSTA'] ?? 'TRIBUNAL',
  }));

  return {
    dados,
    total,
    pagina,
    porPagina,
    totalPaginas: Math.ceil(total / porPagina),
  };
}

// ============================================================================
// Detalhe
// ============================================================================

export async function buscarQuestionario(id: number): Promise<QuestionarioCompleto | null> {
  const q = await prisma.questionario.findUnique({
    where: { SEQ_QUESTIONARIO: id },
    include: {
      periodicidade: true,
      tipoEscopo: true,
      _count: {
        select: { respostas: true },
      },
    },
  });

  if (!q) return null;

  // Buscar perguntas via tabela de vínculo
  const perguntasDb = await buscarPerguntasDoQuestionario(id);
  const qtdPerguntas = perguntasDb.length;

  // Agrupar perguntas por categoria, ordenando por categoria.NUM_ORDEM
  const categoriasMap = new Map<number | null, {
    SEQ_CATEGORIA_PERGUNTA: number | null;
    DSC_CATEGORIA_PERGUNTA: string;
    NUM_ORDEM: number;
    perguntas: PerguntaResumo[];
  }>();

  for (const p of perguntasDb) {
    const catKey = p.SEQ_CATEGORIA_PERGUNTA;

    if (!categoriasMap.has(catKey)) {
      categoriasMap.set(catKey, {
        SEQ_CATEGORIA_PERGUNTA: catKey,
        DSC_CATEGORIA_PERGUNTA: p.categoria?.DSC_CATEGORIA_PERGUNTA ?? 'Sem categoria',
        NUM_ORDEM: p.categoria?.NUM_ORDEM ?? 999999,
        perguntas: [],
      });
    }

    categoriasMap.get(catKey)!.perguntas.push({
      SEQ_PERGUNTA: p.SEQ_PERGUNTA,
      DSC_PERGUNTA: p.DSC_PERGUNTA,
      COD_PERGUNTA: p.COD_PERGUNTA,
      TXT_GLOSSARIO: p.TXT_GLOSSARIO,
      DSC_STATUS: p.DSC_STATUS as StatusPublicacao,
      NUM_VERSAO: p.NUM_VERSAO,
      NUM_ORDEM: p.NUM_ORDEM,
      SEQ_PERGUNTA_BASE: p.SEQ_PERGUNTA_BASE,
      SEQ_CATEGORIA_PERGUNTA: p.SEQ_CATEGORIA_PERGUNTA,
      DSC_CATEGORIA_PERGUNTA: p.categoria?.DSC_CATEGORIA_PERGUNTA ?? null,
      COD_TIPO_FORMATO_RESPOSTA: p.tipoFormato.COD_TIPO_FORMATO_RESPOSTA as PerguntaResumo['COD_TIPO_FORMATO_RESPOSTA'],
      DSC_TIPO_FORMATO_RESPOSTA: p.tipoFormato.DSC_TIPO_FORMATO_RESPOSTA,
      QTD_RESPOSTAS: p._count.respostas,
    });
  }

  // Ordenar categorias por NUM_ORDEM, perguntas dentro de cada categoria já vêm ordenadas
  const categorias: CategoriaGrupo[] = Array.from(categoriasMap.values())
    .sort((a, b) => a.NUM_ORDEM - b.NUM_ORDEM);

  // Contar categorias reais (excluindo "Sem categoria")
  const qtdCategorias = categorias.filter(c => c.SEQ_CATEGORIA_PERGUNTA !== null).length;

  return {
    SEQ_QUESTIONARIO: q.SEQ_QUESTIONARIO,
    NOM_QUESTIONARIO: q.NOM_QUESTIONARIO,
    DSC_QUESTIONARIO: q.DSC_QUESTIONARIO,
    DSC_STATUS: q.DSC_STATUS as StatusPublicacao,
    NUM_VERSAO: q.NUM_VERSAO,
    SEQ_QUESTIONARIO_BASE: q.SEQ_QUESTIONARIO_BASE,
    DAT_CRIACAO_QUESTIONARIO: q.DAT_CRIACAO_QUESTIONARIO,
    DAT_PUBLICACAO: q.DAT_PUBLICACAO,
    NUM_MES_LIMITE: q.NUM_MES_LIMITE,
    NUM_DIA_LIMITE: q.NUM_DIA_LIMITE,
    DSC_OBSERVACAO_QUESTIONARIO: q.DSC_OBSERVACAO_QUESTIONARIO,
    DSC_TIPO_PERIODICIDADE: q.periodicidade.DSC_TIPO_PERIODICIDADE_PERGUNTA,
    SEQ_ORGAO_ESCOPO: q.SEQ_ORGAO_ESCOPO,
    COD_ESCOPO_RESPOSTA: q.tipoEscopo?.COD_TIPO_ESCOPO as QuestionarioResumo['COD_ESCOPO_RESPOSTA'] ?? 'TRIBUNAL',
    QTD_PERGUNTAS: qtdPerguntas,
    QTD_RESPOSTAS: q._count.respostas,
    QTD_CATEGORIAS: qtdCategorias,
    categorias,
  };
}

// ============================================================================
// Criar
// ============================================================================

export async function criarQuestionario(
  input: CriarQuestionarioInput,
  usuario: string
): Promise<number> {
  const q = await prisma.questionario.create({
    data: {
      NOM_QUESTIONARIO: input.NOM_QUESTIONARIO,
      DSC_QUESTIONARIO: input.DSC_QUESTIONARIO,
      SEQ_TIPO_PERIODICIDADE_PERGUNTA: input.SEQ_TIPO_PERIODICIDADE_PERGUNTA,
      NUM_MES_LIMITE: input.NUM_MES_LIMITE,
      NUM_DIA_LIMITE: input.NUM_DIA_LIMITE ?? null,
      DSC_OBSERVACAO_QUESTIONARIO: input.DSC_OBSERVACAO_QUESTIONARIO ?? null,
      SEQ_TIPO_ESCOPO_RESPOSTA: input.COD_ESCOPO_RESPOSTA
        ? (await prisma.tipoEscopoResposta.findUnique({
            where: { COD_TIPO_ESCOPO: input.COD_ESCOPO_RESPOSTA },
          }))?.SEQ_TIPO_ESCOPO_RESPOSTA ?? null
        : null,
      SEQ_ORGAO_ESCOPO: input.SEQ_ORGAO_ESCOPO ?? null,
      DSC_STATUS: 'RASCUNHO',
      NUM_VERSAO: 1,
      USU_CRIACAO_QUESTIONARIO: usuario,
      DAT_CRIACAO_QUESTIONARIO: new Date(),
    },
  });

  return q.SEQ_QUESTIONARIO;
}

// ============================================================================
// Editar
// ============================================================================

export async function editarQuestionario(
  id: number,
  input: EditarQuestionarioInput
): Promise<void> {
  const q = await prisma.questionario.findUnique({
    where: { SEQ_QUESTIONARIO: id },
    select: { DSC_STATUS: true },
  });

  if (!q) {
    throw new Error('Questionário não encontrado');
  }

  if (q.DSC_STATUS !== 'RASCUNHO') {
    throw new Error('Apenas questionários em RASCUNHO podem ser editados');
  }

  const data: Record<string, unknown> = {};
  if (input.NOM_QUESTIONARIO !== undefined) data.NOM_QUESTIONARIO = input.NOM_QUESTIONARIO;
  if (input.DSC_QUESTIONARIO !== undefined) data.DSC_QUESTIONARIO = input.DSC_QUESTIONARIO;
  if (input.NUM_MES_LIMITE !== undefined) data.NUM_MES_LIMITE = input.NUM_MES_LIMITE;
  if (input.NUM_DIA_LIMITE !== undefined) data.NUM_DIA_LIMITE = input.NUM_DIA_LIMITE;
  if (input.DSC_OBSERVACAO_QUESTIONARIO !== undefined) data.DSC_OBSERVACAO_QUESTIONARIO = input.DSC_OBSERVACAO_QUESTIONARIO;

  await prisma.questionario.update({
    where: { SEQ_QUESTIONARIO: id },
    data,
  });
}

// ============================================================================
// Excluir
// ============================================================================

export async function excluirQuestionario(id: number): Promise<void> {
  const q = await prisma.questionario.findUnique({
    where: { SEQ_QUESTIONARIO: id },
    include: {
      _count: { select: { respostas: true } },
    },
  });

  if (!q) {
    throw new Error('Questionário não encontrado');
  }

  if (q.DSC_STATUS !== 'RASCUNHO') {
    throw new Error('Apenas questionários em RASCUNHO podem ser excluídos');
  }

  if (q._count.respostas > 0) {
    throw new Error('Não é possível excluir questionário com respostas vinculadas');
  }

  // Remover vínculos na tabela de junção e depois o questionário
  await prisma.$transaction([
    prisma.questionarioPergunta.deleteMany({ where: { SEQ_QUESTIONARIO: id } }),
    prisma.questionario.delete({ where: { SEQ_QUESTIONARIO: id } }),
  ]);
}

// ============================================================================
// Publicar
// ============================================================================

export async function publicarQuestionario(
  id: number,
  usuario: string
): Promise<void> {
  const q = await prisma.questionario.findUnique({
    where: { SEQ_QUESTIONARIO: id },
    select: { DSC_STATUS: true },
  });

  if (!q) {
    throw new Error('Questionário não encontrado');
  }

  if (q.DSC_STATUS !== 'RASCUNHO') {
    throw new Error('Apenas questionários em RASCUNHO podem ser publicados');
  }

  const agora = new Date();

  // Buscar SEQ_PERGUNTAs vinculadas via tabela de junção
  const vinculos = await prisma.questionarioPergunta.findMany({
    where: { SEQ_QUESTIONARIO: id, FLG_ATIVO: 'S' },
    select: { SEQ_PERGUNTA: true },
  });
  const seqPerguntas = vinculos.map(v => v.SEQ_PERGUNTA);

  // Publicar questionário + cascata nas perguntas vinculadas
  const ops = [
    prisma.questionario.update({
      where: { SEQ_QUESTIONARIO: id },
      data: {
        DSC_STATUS: 'PUBLICADO',
        DAT_PUBLICACAO: agora,
        USU_PUBLICACAO: usuario,
      },
    }),
  ];

  if (seqPerguntas.length > 0) {
    ops.push(
      prisma.pergunta.updateMany({
        where: {
          SEQ_PERGUNTA: { in: seqPerguntas },
          DSC_STATUS: 'RASCUNHO',
        },
        data: {
          DSC_STATUS: 'PUBLICADO',
          DAT_PUBLICACAO: agora,
          USU_PUBLICACAO: usuario,
        },
      }) as never // updateMany retorna BatchPayload, OK no $transaction
    );
  }

  await prisma.$transaction(ops);
}

// ============================================================================
// Nova Versão
// ============================================================================

export async function criarNovaVersao(
  id: number,
  usuario: string
): Promise<number> {
  const original = await prisma.questionario.findUnique({
    where: { SEQ_QUESTIONARIO: id },
  });

  if (!original) {
    throw new Error('Questionário não encontrado');
  }

  if (original.DSC_STATUS !== 'PUBLICADO') {
    throw new Error('Apenas questionários PUBLICADOS podem gerar nova versão');
  }

  // Buscar perguntas via tabela de junção
  const perguntasOriginais = await buscarPerguntasVinculadas(id);

  // Raiz = SEQ_QUESTIONARIO_BASE do original, ou o próprio SEQ se for a raiz
  const seqRaiz = original.SEQ_QUESTIONARIO_BASE ?? original.SEQ_QUESTIONARIO;

  const novoQ = await prisma.questionario.create({
    data: {
      SEQ_QUESTIONARIO_BASE: seqRaiz,
      NUM_VERSAO: original.NUM_VERSAO + 1,
      DSC_STATUS: 'RASCUNHO',
      SEQ_TIPO_PERIODICIDADE_PERGUNTA: original.SEQ_TIPO_PERIODICIDADE_PERGUNTA,
      SEQ_TIPO_ESCOPO_RESPOSTA: original.SEQ_TIPO_ESCOPO_RESPOSTA,
      SEQ_ORGAO_ESCOPO: original.SEQ_ORGAO_ESCOPO,
      NOM_QUESTIONARIO: original.NOM_QUESTIONARIO,
      DSC_QUESTIONARIO: original.DSC_QUESTIONARIO,
      NUM_MES_LIMITE: original.NUM_MES_LIMITE,
      NUM_DIA_LIMITE: original.NUM_DIA_LIMITE,
      DSC_OBSERVACAO_QUESTIONARIO: original.DSC_OBSERVACAO_QUESTIONARIO,
      USU_CRIACAO_QUESTIONARIO: usuario,
      DAT_CRIACAO_QUESTIONARIO: new Date(),
    },
  });

  // Copiar perguntas e criar vínculos na tabela de junção
  for (const p of perguntasOriginais) {
    const seqPerguntaRaiz = p.SEQ_PERGUNTA_BASE ?? p.SEQ_PERGUNTA;
    const novaPergunta = await prisma.pergunta.create({
      data: {
        SEQ_PERGUNTA_BASE: seqPerguntaRaiz,
        NUM_VERSAO: p.NUM_VERSAO + 1,
        DSC_STATUS: 'RASCUNHO',
        NUM_ORDEM: p.NUM_ORDEM,
        SEQ_TIPO_VARIAVEL_PERGUNTA: p.SEQ_TIPO_VARIAVEL_PERGUNTA,
        SEQ_TIPO_PERIODICIDADE_PERGUNTA: p.SEQ_TIPO_PERIODICIDADE_PERGUNTA,
        SEQ_TIPO_FORMATO_RESPOSTA: p.SEQ_TIPO_FORMATO_RESPOSTA,
        SEQ_CATEGORIA_PERGUNTA: p.SEQ_CATEGORIA_PERGUNTA,
        DSC_PERGUNTA: p.DSC_PERGUNTA,
        DSC_COMPLEMENTO_PERGUNTA: p.DSC_COMPLEMENTO_PERGUNTA,
        COD_PERGUNTA: p.COD_PERGUNTA,
        TXT_GLOSSARIO: p.TXT_GLOSSARIO,
        FLG_RESPOSTA_AUTOMATICA: p.FLG_RESPOSTA_AUTOMATICA,
        TXT_JSON_ARRAY_RESPOSTAS: p.TXT_JSON_ARRAY_RESPOSTAS,
        USU_CRIACAO_PERGUNTA: usuario,
        DAT_CRIACAO_PERGUNTA: new Date(),
      },
    });

    // Criar vínculo na tabela de junção
    await prisma.questionarioPergunta.create({
      data: {
        SEQ_QUESTIONARIO: novoQ.SEQ_QUESTIONARIO,
        SEQ_PERGUNTA: novaPergunta.SEQ_PERGUNTA,
      },
    });
  }

  return novoQ.SEQ_QUESTIONARIO;
}

// Helper: buscar perguntas vinculadas (dados completos para cópia)
async function buscarPerguntasVinculadas(seqQuestionario: number) {
  const vinculos = await prisma.questionarioPergunta.findMany({
    where: {
      SEQ_QUESTIONARIO: seqQuestionario,
      FLG_ATIVO: 'S',
    },
    select: { SEQ_PERGUNTA: true },
  });

  if (vinculos.length === 0) return [];

  return prisma.pergunta.findMany({
    where: { SEQ_PERGUNTA: { in: vinculos.map(v => v.SEQ_PERGUNTA) } },
    orderBy: { NUM_ORDEM: 'asc' },
  });
}

// ============================================================================
// Editar Categoria
// ============================================================================

export async function editarCategoria(
  id: number,
  dscCategoria: string
): Promise<void> {
  const cat = await prisma.categoriaPergunta.findUnique({
    where: { SEQ_CATEGORIA_PERGUNTA: id },
  });

  if (!cat) {
    throw new Error('Categoria não encontrada');
  }

  await prisma.categoriaPergunta.update({
    where: { SEQ_CATEGORIA_PERGUNTA: id },
    data: { DSC_CATEGORIA_PERGUNTA: dscCategoria.trim() },
  });
}

// ============================================================================
// Lookups
// ============================================================================

export async function listarPeriodicidades(): Promise<Periodicidade[]> {
  return prisma.tipoPeriodicidadePergunta.findMany({
    orderBy: { SEQ_TIPO_PERIODICIDADE_PERGUNTA: 'asc' },
  });
}

export async function listarEscopos(): Promise<Escopo[]> {
  return prisma.tipoEscopoResposta.findMany({
    orderBy: { SEQ_TIPO_ESCOPO_RESPOSTA: 'asc' },
  });
}

// ============================================================================
// Lookups para perguntas
// ============================================================================

export async function listarFormatosResposta(): Promise<FormatoResposta[]> {
  return prisma.tipoFormatoResposta.findMany({
    orderBy: { SEQ_TIPO_FORMATO_RESPOSTA: 'asc' },
  });
}

export async function listarVariaveisPergunta(): Promise<VariavelPergunta[]> {
  return prisma.tipoVariavelPergunta.findMany({
    orderBy: { SEQ_TIPO_VARIAVEL_PERGUNTA: 'asc' },
  });
}

// ============================================================================
// CRUD de Perguntas
// ============================================================================

export async function buscarPerguntaCompleta(seqPergunta: number): Promise<PerguntaCompleta | null> {
  const p = await prisma.pergunta.findUnique({
    where: { SEQ_PERGUNTA: seqPergunta },
    include: {
      tipoFormato: true,
      tipoVariavel: true,
      periodicidade: true,
      categoria: true,
      _count: { select: { respostas: true } },
    },
  });

  if (!p) return null;

  return {
    SEQ_PERGUNTA: p.SEQ_PERGUNTA,
    DSC_PERGUNTA: p.DSC_PERGUNTA,
    COD_PERGUNTA: p.COD_PERGUNTA,
    TXT_GLOSSARIO: p.TXT_GLOSSARIO,
    DSC_STATUS: p.DSC_STATUS as StatusPublicacao,
    NUM_VERSAO: p.NUM_VERSAO,
    NUM_ORDEM: p.NUM_ORDEM,
    SEQ_PERGUNTA_BASE: p.SEQ_PERGUNTA_BASE,
    SEQ_CATEGORIA_PERGUNTA: p.SEQ_CATEGORIA_PERGUNTA,
    DSC_CATEGORIA_PERGUNTA: p.categoria?.DSC_CATEGORIA_PERGUNTA ?? null,
    COD_TIPO_FORMATO_RESPOSTA: p.tipoFormato.COD_TIPO_FORMATO_RESPOSTA as PerguntaCompleta['COD_TIPO_FORMATO_RESPOSTA'],
    DSC_TIPO_FORMATO_RESPOSTA: p.tipoFormato.DSC_TIPO_FORMATO_RESPOSTA,
    QTD_RESPOSTAS: p._count.respostas,
    DSC_COMPLEMENTO_PERGUNTA: p.DSC_COMPLEMENTO_PERGUNTA,
    TXT_JSON_ARRAY_RESPOSTAS: p.TXT_JSON_ARRAY_RESPOSTAS,
    opcoes: parseOpcoes(p.TXT_JSON_ARRAY_RESPOSTAS),
    SEQ_TIPO_FORMATO_RESPOSTA: p.SEQ_TIPO_FORMATO_RESPOSTA,
    SEQ_TIPO_VARIAVEL_PERGUNTA: p.SEQ_TIPO_VARIAVEL_PERGUNTA,
    SEQ_TIPO_PERIODICIDADE_PERGUNTA: p.SEQ_TIPO_PERIODICIDADE_PERGUNTA,
    DSC_TIPO_PERIODICIDADE: p.periodicidade.DSC_TIPO_PERIODICIDADE_PERGUNTA,
    DSC_TIPO_VARIAVEL: p.tipoVariavel.DSC_TIPO_VARIAVEL_PERGUNTA ?? '',
    DAT_CRIACAO_PERGUNTA: p.DAT_CRIACAO_PERGUNTA,
    DAT_PUBLICACAO: p.DAT_PUBLICACAO,
  };
}

export async function criarPergunta(
  input: CriarPerguntaInput,
  usuario: string
): Promise<number> {
  // Validar que questionário é RASCUNHO
  const q = await prisma.questionario.findUnique({
    where: { SEQ_QUESTIONARIO: input.SEQ_QUESTIONARIO },
    select: { DSC_STATUS: true },
  });

  if (!q) throw new Error('Questionário não encontrado');
  if (q.DSC_STATUS !== 'RASCUNHO') throw new Error('Apenas questionários em RASCUNHO podem receber perguntas');

  // Calcular NUM_ORDEM se não fornecido
  let numOrdem = input.NUM_ORDEM;
  if (numOrdem === undefined) {
    const maxOrdem = await prisma.questionarioPergunta.findMany({
      where: { SEQ_QUESTIONARIO: input.SEQ_QUESTIONARIO, FLG_ATIVO: 'S' },
      select: { SEQ_PERGUNTA: true },
    });
    if (maxOrdem.length > 0) {
      const perguntas = await prisma.pergunta.findMany({
        where: { SEQ_PERGUNTA: { in: maxOrdem.map(v => v.SEQ_PERGUNTA) } },
        select: { NUM_ORDEM: true },
        orderBy: { NUM_ORDEM: 'desc' },
        take: 1,
      });
      numOrdem = (perguntas[0]?.NUM_ORDEM ?? 0) + 1;
    } else {
      numOrdem = 1;
    }
  }

  // Criar pergunta + vínculo em transação
  const resultado = await prisma.$transaction(async (tx) => {
    const pergunta = await tx.pergunta.create({
      data: {
        DSC_PERGUNTA: input.DSC_PERGUNTA,
        SEQ_TIPO_FORMATO_RESPOSTA: input.SEQ_TIPO_FORMATO_RESPOSTA,
        SEQ_TIPO_PERIODICIDADE_PERGUNTA: input.SEQ_TIPO_PERIODICIDADE_PERGUNTA,
        SEQ_TIPO_VARIAVEL_PERGUNTA: input.SEQ_TIPO_VARIAVEL_PERGUNTA,
        SEQ_CATEGORIA_PERGUNTA: input.SEQ_CATEGORIA_PERGUNTA ?? null,
        COD_PERGUNTA: input.COD_PERGUNTA ?? null,
        DSC_COMPLEMENTO_PERGUNTA: input.DSC_COMPLEMENTO_PERGUNTA ?? null,
        TXT_GLOSSARIO: input.TXT_GLOSSARIO ?? null,
        TXT_JSON_ARRAY_RESPOSTAS: input.opcoes?.length ? serializeOpcoes(input.opcoes) : null,
        NUM_ORDEM: numOrdem!,
        DSC_STATUS: 'RASCUNHO',
        NUM_VERSAO: 1,
        USU_CRIACAO_PERGUNTA: usuario,
        DAT_CRIACAO_PERGUNTA: new Date(),
      },
    });

    await tx.questionarioPergunta.create({
      data: {
        SEQ_QUESTIONARIO: input.SEQ_QUESTIONARIO,
        SEQ_PERGUNTA: pergunta.SEQ_PERGUNTA,
        FLG_ATIVO: 'S',
      },
    });

    return pergunta.SEQ_PERGUNTA;
  });

  return resultado;
}

export async function editarPergunta(
  seqQuestionario: number,
  seqPergunta: number,
  input: EditarPerguntaInput
): Promise<void> {
  // Validar que questionário é RASCUNHO
  const q = await prisma.questionario.findUnique({
    where: { SEQ_QUESTIONARIO: seqQuestionario },
    select: { DSC_STATUS: true },
  });

  if (!q) throw new Error('Questionário não encontrado');
  if (q.DSC_STATUS !== 'RASCUNHO') throw new Error('Apenas questionários em RASCUNHO podem ser editados');

  // Validar que pergunta está vinculada ao questionário
  const vinculo = await prisma.questionarioPergunta.findUnique({
    where: {
      SEQ_QUESTIONARIO_SEQ_PERGUNTA: {
        SEQ_QUESTIONARIO: seqQuestionario,
        SEQ_PERGUNTA: seqPergunta,
      },
    },
  });

  if (!vinculo || vinculo.FLG_ATIVO !== 'S') {
    throw new Error('Pergunta não vinculada a este questionário');
  }

  const data: Record<string, unknown> = {};
  if (input.DSC_PERGUNTA !== undefined) data.DSC_PERGUNTA = input.DSC_PERGUNTA;
  if (input.COD_PERGUNTA !== undefined) data.COD_PERGUNTA = input.COD_PERGUNTA;
  if (input.DSC_COMPLEMENTO_PERGUNTA !== undefined) data.DSC_COMPLEMENTO_PERGUNTA = input.DSC_COMPLEMENTO_PERGUNTA;
  if (input.TXT_GLOSSARIO !== undefined) data.TXT_GLOSSARIO = input.TXT_GLOSSARIO;
  if (input.opcoes !== undefined) data.TXT_JSON_ARRAY_RESPOSTAS = input.opcoes.length ? serializeOpcoes(input.opcoes) : null;
  if (input.SEQ_CATEGORIA_PERGUNTA !== undefined) data.SEQ_CATEGORIA_PERGUNTA = input.SEQ_CATEGORIA_PERGUNTA;
  if (input.NUM_ORDEM !== undefined) data.NUM_ORDEM = input.NUM_ORDEM;

  await prisma.pergunta.update({
    where: { SEQ_PERGUNTA: seqPergunta },
    data,
  });
}

export async function excluirPergunta(
  seqQuestionario: number,
  seqPergunta: number
): Promise<void> {
  // Validar que questionário é RASCUNHO
  const q = await prisma.questionario.findUnique({
    where: { SEQ_QUESTIONARIO: seqQuestionario },
    select: { DSC_STATUS: true },
  });

  if (!q) throw new Error('Questionário não encontrado');
  if (q.DSC_STATUS !== 'RASCUNHO') throw new Error('Apenas questionários em RASCUNHO podem ter perguntas excluídas');

  // Verificar se tem respostas
  const pergunta = await prisma.pergunta.findUnique({
    where: { SEQ_PERGUNTA: seqPergunta },
    include: { _count: { select: { respostas: true } } },
  });

  if (!pergunta) throw new Error('Pergunta não encontrada');

  if (pergunta._count.respostas > 0) {
    // Soft delete: desvincula
    await prisma.questionarioPergunta.update({
      where: {
        SEQ_QUESTIONARIO_SEQ_PERGUNTA: {
          SEQ_QUESTIONARIO: seqQuestionario,
          SEQ_PERGUNTA: seqPergunta,
        },
      },
      data: { FLG_ATIVO: 'N' },
    });
  } else {
    // Hard delete: remove vínculo + pergunta
    await prisma.$transaction([
      prisma.questionarioPergunta.delete({
        where: {
          SEQ_QUESTIONARIO_SEQ_PERGUNTA: {
            SEQ_QUESTIONARIO: seqQuestionario,
            SEQ_PERGUNTA: seqPergunta,
          },
        },
      }),
      prisma.pergunta.delete({
        where: { SEQ_PERGUNTA: seqPergunta },
      }),
    ]);
  }
}

export async function reordenarPerguntas(
  seqQuestionario: number,
  ordens: ReordenarPerguntaItem[]
): Promise<void> {
  // Validar que questionário é RASCUNHO
  const q = await prisma.questionario.findUnique({
    where: { SEQ_QUESTIONARIO: seqQuestionario },
    select: { DSC_STATUS: true },
  });

  if (!q) throw new Error('Questionário não encontrado');
  if (q.DSC_STATUS !== 'RASCUNHO') throw new Error('Apenas questionários em RASCUNHO podem ser reordenados');

  // Batch update em transação
  await prisma.$transaction(
    ordens.map((item) =>
      prisma.pergunta.update({
        where: { SEQ_PERGUNTA: item.SEQ_PERGUNTA },
        data: {
          NUM_ORDEM: item.NUM_ORDEM,
          SEQ_CATEGORIA_PERGUNTA: item.SEQ_CATEGORIA_PERGUNTA,
        },
      })
    )
  );
}

export async function buscarPerguntasTemplate(
  busca: string,
  limite: number = 10
): Promise<PerguntaResumo[]> {
  const perguntas = await prisma.pergunta.findMany({
    where: {
      OR: [
        { DSC_PERGUNTA: { contains: busca } },
        { COD_PERGUNTA: { contains: busca } },
      ],
    },
    include: {
      tipoFormato: true,
      categoria: true,
      _count: { select: { respostas: true } },
    },
    orderBy: { SEQ_PERGUNTA: 'desc' },
    take: limite,
  });

  return perguntas.map((p) => ({
    SEQ_PERGUNTA: p.SEQ_PERGUNTA,
    DSC_PERGUNTA: p.DSC_PERGUNTA,
    COD_PERGUNTA: p.COD_PERGUNTA,
    TXT_GLOSSARIO: p.TXT_GLOSSARIO,
    DSC_STATUS: p.DSC_STATUS as StatusPublicacao,
    NUM_VERSAO: p.NUM_VERSAO,
    NUM_ORDEM: p.NUM_ORDEM,
    SEQ_PERGUNTA_BASE: p.SEQ_PERGUNTA_BASE,
    SEQ_CATEGORIA_PERGUNTA: p.SEQ_CATEGORIA_PERGUNTA,
    DSC_CATEGORIA_PERGUNTA: p.categoria?.DSC_CATEGORIA_PERGUNTA ?? null,
    COD_TIPO_FORMATO_RESPOSTA: p.tipoFormato.COD_TIPO_FORMATO_RESPOSTA as PerguntaResumo['COD_TIPO_FORMATO_RESPOSTA'],
    DSC_TIPO_FORMATO_RESPOSTA: p.tipoFormato.DSC_TIPO_FORMATO_RESPOSTA,
    QTD_RESPOSTAS: p._count.respostas,
  }));
}

// ============================================================================
// Criar Categoria
// ============================================================================

export async function criarCategoria(
  input: { DSC_CATEGORIA_PERGUNTA: string; SEQ_CATEGORIA_PERGUNTA_PAI?: number; NUM_ORDEM?: number },
  usuario: string
): Promise<number> {
  // Calcular NUM_ORDEM se não fornecido
  let numOrdem = input.NUM_ORDEM;
  if (numOrdem === undefined) {
    const maxCat = await prisma.categoriaPergunta.findFirst({
      orderBy: { NUM_ORDEM: 'desc' },
      select: { NUM_ORDEM: true },
    });
    numOrdem = (maxCat?.NUM_ORDEM ?? 0) + 1;
  }

  const cat = await prisma.categoriaPergunta.create({
    data: {
      DSC_CATEGORIA_PERGUNTA: input.DSC_CATEGORIA_PERGUNTA.trim(),
      SEQ_CATEGORIA_PERGUNTA_PAI: input.SEQ_CATEGORIA_PERGUNTA_PAI ?? null,
      NUM_ORDEM: numOrdem,
      DSC_STATUS: 'RASCUNHO',
      NUM_VERSAO: 1,
      USU_INCLUSAO: usuario,
      DAT_INCLUSAO: new Date(),
    },
  });

  return cat.SEQ_CATEGORIA_PERGUNTA;
}
