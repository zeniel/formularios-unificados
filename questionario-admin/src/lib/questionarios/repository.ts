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
  ReordenarPerguntaItem,
  VersaoResumo,
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
  tipo?: 'periodico' | 'sob-demanda';
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
  const { busca, pagina = 1, porPagina = 20, tipo } = filtros;

  // Buscar todos os questionários (volume baixo ~59) para agrupar por raiz
  const todos = await prisma.questionario.findMany({
    include: {
      periodicidade: true,
      tipoEscopo: true,
      _count: {
        select: {
          respostas: true,
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
  });

  // Agrupar por raiz (SEQ_QUESTIONARIO_BASE ?? SEQ_QUESTIONARIO)
  const grupos = new Map<number, typeof todos>();
  for (const q of todos) {
    const raiz = q.SEQ_QUESTIONARIO_BASE ?? q.SEQ_QUESTIONARIO;
    if (!grupos.has(raiz)) {
      grupos.set(raiz, []);
    }
    grupos.get(raiz)!.push(q);
  }

  // Para cada grupo, selecionar o representante e marcar TEM_RASCUNHO
  const representantes: QuestionarioResumo[] = [];
  for (const [, grupo] of grupos) {
    const rascunho = grupo.find(q => q.DSC_STATUS === 'RASCUNHO');
    const temRascunho = !!rascunho;

    // Representante: RASCUNHO se existir, senão PUBLICADO de maior versão
    const representante = rascunho
      ?? grupo
        .filter(q => q.DSC_STATUS === 'PUBLICADO')
        .sort((a, b) => b.NUM_VERSAO - a.NUM_VERSAO)[0];

    if (!representante) continue;

    representantes.push({
      SEQ_QUESTIONARIO: representante.SEQ_QUESTIONARIO,
      NOM_QUESTIONARIO: representante.NOM_QUESTIONARIO,
      DSC_STATUS: representante.DSC_STATUS as StatusPublicacao,
      NUM_VERSAO: representante.NUM_VERSAO,
      SEQ_QUESTIONARIO_BASE: representante.SEQ_QUESTIONARIO_BASE,
      DAT_CRIACAO_QUESTIONARIO: representante.DAT_CRIACAO_QUESTIONARIO,
      DAT_PUBLICACAO: representante.DAT_PUBLICACAO,
      QTD_PERGUNTAS: representante.questionarioPergunta.length,
      QTD_RESPOSTAS: representante._count.respostas,
      COD_ESCOPO_RESPOSTA: representante.tipoEscopo?.COD_TIPO_ESCOPO as QuestionarioResumo['COD_ESCOPO_RESPOSTA'] ?? 'TRIBUNAL',
      TEM_RASCUNHO: temRascunho,
      SEQ_TIPO_PERIODICIDADE_PERGUNTA: representante.SEQ_TIPO_PERIODICIDADE_PERGUNTA,
    });
  }

  // Ordenar por data de criação desc
  representantes.sort((a, b) =>
    new Date(b.DAT_CRIACAO_QUESTIONARIO).getTime() - new Date(a.DAT_CRIACAO_QUESTIONARIO).getTime()
  );

  // Filtrar por tipo de periodicidade (periódico vs sob-demanda)
  // NULL = sob demanda, NOT NULL = periódico
  const filtradosPorTipo = tipo
    ? representantes.filter(q =>
        tipo === 'sob-demanda'
          ? q.SEQ_TIPO_PERIODICIDADE_PERGUNTA === null
          : q.SEQ_TIPO_PERIODICIDADE_PERGUNTA !== null
      )
    : representantes;

  // Filtrar por busca (nome)
  const filtrados = busca
    ? filtradosPorTipo.filter(q =>
        q.NOM_QUESTIONARIO.toLowerCase().includes(busca.toLowerCase())
      )
    : filtradosPorTipo;

  // Paginar em memória
  const total = filtrados.length;
  const skip = (pagina - 1) * porPagina;
  const dados = filtrados.slice(skip, skip + porPagina);

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
      escopoOrgaos: { select: { SEQ_ORGAO: true } },
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

  // Incluir categorias RASCUNHO vazias (sem perguntas neste questionário)
  const todasCategorias = await prisma.categoriaPergunta.findMany({
    where: { DSC_STATUS: 'RASCUNHO' },
    select: {
      SEQ_CATEGORIA_PERGUNTA: true,
      DSC_CATEGORIA_PERGUNTA: true,
      NUM_ORDEM: true,
    },
  });
  for (const cat of todasCategorias) {
    if (!categoriasMap.has(cat.SEQ_CATEGORIA_PERGUNTA)) {
      categoriasMap.set(cat.SEQ_CATEGORIA_PERGUNTA, {
        SEQ_CATEGORIA_PERGUNTA: cat.SEQ_CATEGORIA_PERGUNTA,
        DSC_CATEGORIA_PERGUNTA: cat.DSC_CATEGORIA_PERGUNTA,
        NUM_ORDEM: cat.NUM_ORDEM,
        perguntas: [],
      });
    }
  }

  // Ordenar categorias por NUM_ORDEM, perguntas dentro de cada categoria já vêm ordenadas
  const categorias: CategoriaGrupo[] = Array.from(categoriasMap.values())
    .sort((a, b) => a.NUM_ORDEM - b.NUM_ORDEM);

  // Contar categorias reais (excluindo "Sem categoria")
  const qtdCategorias = categorias.filter(c => c.SEQ_CATEGORIA_PERGUNTA !== null).length;

  // Buscar versões (publicadas) da mesma raiz
  const raiz = q.SEQ_QUESTIONARIO_BASE ?? q.SEQ_QUESTIONARIO;
  const versoesDb = await prisma.questionario.findMany({
    where: {
      OR: [
        { SEQ_QUESTIONARIO: raiz },
        { SEQ_QUESTIONARIO_BASE: raiz },
      ],
      DSC_STATUS: 'PUBLICADO',
    },
    select: {
      SEQ_QUESTIONARIO: true,
      NUM_VERSAO: true,
      DSC_STATUS: true,
      DAT_PUBLICACAO: true,
    },
    orderBy: { NUM_VERSAO: 'desc' },
  });

  const versoes: VersaoResumo[] = versoesDb.map(v => ({
    SEQ_QUESTIONARIO: v.SEQ_QUESTIONARIO,
    NUM_VERSAO: v.NUM_VERSAO,
    DSC_STATUS: v.DSC_STATUS as StatusPublicacao,
    DAT_PUBLICACAO: v.DAT_PUBLICACAO,
  }));

  // Verificar se existe RASCUNHO na mesma raiz
  const rascunhoExistente = await prisma.questionario.findFirst({
    where: {
      OR: [
        { SEQ_QUESTIONARIO: raiz, DSC_STATUS: 'RASCUNHO' },
        { SEQ_QUESTIONARIO_BASE: raiz, DSC_STATUS: 'RASCUNHO' },
      ],
    },
    select: { SEQ_QUESTIONARIO: true },
  });
  const temRascunho = !!rascunhoExistente;

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
    DSC_TIPO_PERIODICIDADE: q.periodicidade?.DSC_TIPO_PERIODICIDADE_PERGUNTA ?? null,
    SEQ_TIPO_PERIODICIDADE_PERGUNTA: q.SEQ_TIPO_PERIODICIDADE_PERGUNTA,
    SEQ_ORGAO_ESCOPO: q.SEQ_ORGAO_ESCOPO,
    COD_ESCOPO_RESPOSTA: q.tipoEscopo?.COD_TIPO_ESCOPO as QuestionarioResumo['COD_ESCOPO_RESPOSTA'] ?? 'TRIBUNAL',
    DSC_TIPO_ESCOPO: q.tipoEscopo?.DSC_TIPO_ESCOPO ?? null,
    DSC_DETALHES: q.tipoEscopo?.DSC_DETALHES ?? null,
    QTD_PERGUNTAS: qtdPerguntas,
    QTD_RESPOSTAS: q._count.respostas,
    QTD_CATEGORIAS: qtdCategorias,
    categorias,
    versoes,
    TEM_RASCUNHO: temRascunho,
    DAT_ATIVACAO_FORMULARIO: q.DAT_ATIVACAO_FORMULARIO,
    DAT_INATIVACAO_FORMULARIO: q.DAT_INATIVACAO_FORMULARIO,
    escopoOrgaos: q.escopoOrgaos.map(e => e.SEQ_ORGAO),
  };
}

// ============================================================================
// Criar
// ============================================================================

export async function criarQuestionario(
  input: CriarQuestionarioInput,
  usuario: string
): Promise<number> {
  // Resolver SEQ_TIPO_ESCOPO_RESPOSTA a partir do código
  const seqEscopo = input.COD_ESCOPO_RESPOSTA
    ? (await prisma.tipoEscopoResposta.findUnique({
        where: { COD_TIPO_ESCOPO: input.COD_ESCOPO_RESPOSTA },
      }))?.SEQ_TIPO_ESCOPO_RESPOSTA ?? undefined
    : undefined;

  const q = await prisma.questionario.create({
    data: {
      NOM_QUESTIONARIO: input.NOM_QUESTIONARIO,
      DSC_QUESTIONARIO: input.DSC_QUESTIONARIO,
      SEQ_TIPO_PERIODICIDADE_PERGUNTA: input.SEQ_TIPO_PERIODICIDADE_PERGUNTA ?? undefined,
      NUM_MES_LIMITE: input.NUM_MES_LIMITE ?? undefined,
      NUM_DIA_LIMITE: input.NUM_DIA_LIMITE ?? undefined,
      DSC_OBSERVACAO_QUESTIONARIO: input.DSC_OBSERVACAO_QUESTIONARIO ?? undefined,
      SEQ_TIPO_ESCOPO_RESPOSTA: seqEscopo,
      SEQ_ORGAO_ESCOPO: input.SEQ_ORGAO_ESCOPO ?? undefined,
      DAT_ATIVACAO_FORMULARIO: input.DAT_ATIVACAO_FORMULARIO ? new Date(input.DAT_ATIVACAO_FORMULARIO) : undefined,
      DAT_INATIVACAO_FORMULARIO: input.DAT_INATIVACAO_FORMULARIO ? new Date(input.DAT_INATIVACAO_FORMULARIO) : undefined,
      DSC_STATUS: 'RASCUNHO',
      NUM_VERSAO: 1,
      USU_CRIACAO_QUESTIONARIO: usuario,
      DAT_CRIACAO_QUESTIONARIO: new Date(),
    },
  });

  // Vincular órgãos/tribunais do escopo
  if (input.escopoOrgaos?.length) {
    await prisma.questionarioTribunal.createMany({
      data: input.escopoOrgaos.map(seqOrgao => ({
        SEQ_ORGAO: seqOrgao,
        SEQ_QUESTIONARIO: q.SEQ_QUESTIONARIO,
      })),
    });
  }

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
  if (input.DAT_ATIVACAO_FORMULARIO !== undefined) data.DAT_ATIVACAO_FORMULARIO = input.DAT_ATIVACAO_FORMULARIO ? new Date(input.DAT_ATIVACAO_FORMULARIO) : null;
  if (input.DAT_INATIVACAO_FORMULARIO !== undefined) data.DAT_INATIVACAO_FORMULARIO = input.DAT_INATIVACAO_FORMULARIO ? new Date(input.DAT_INATIVACAO_FORMULARIO) : null;

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

  // Remover vínculos nas tabelas de junção e depois o questionário
  await prisma.$transaction([
    prisma.questionarioTribunal.deleteMany({ where: { SEQ_QUESTIONARIO: id } }),
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

  // Verificar se já existe RASCUNHO na mesma raiz
  const seqRaizCheck = original.SEQ_QUESTIONARIO_BASE ?? original.SEQ_QUESTIONARIO;
  const rascunhoExistente = await prisma.questionario.findFirst({
    where: {
      OR: [
        { SEQ_QUESTIONARIO: seqRaizCheck, DSC_STATUS: 'RASCUNHO' },
        { SEQ_QUESTIONARIO_BASE: seqRaizCheck, DSC_STATUS: 'RASCUNHO' },
      ],
    },
  });
  if (rascunhoExistente) {
    throw new Error('Já existe uma versão em RASCUNHO deste formulário');
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
      SEQ_TIPO_PERIODICIDADE_PERGUNTA: original.SEQ_TIPO_PERIODICIDADE_PERGUNTA ?? undefined,
      SEQ_TIPO_ESCOPO_RESPOSTA: original.SEQ_TIPO_ESCOPO_RESPOSTA ?? undefined,
      SEQ_ORGAO_ESCOPO: original.SEQ_ORGAO_ESCOPO,
      NOM_QUESTIONARIO: original.NOM_QUESTIONARIO,
      DSC_QUESTIONARIO: original.DSC_QUESTIONARIO,
      NUM_MES_LIMITE: original.NUM_MES_LIMITE,
      NUM_DIA_LIMITE: original.NUM_DIA_LIMITE,
      DSC_OBSERVACAO_QUESTIONARIO: original.DSC_OBSERVACAO_QUESTIONARIO,
      DAT_ATIVACAO_FORMULARIO: original.DAT_ATIVACAO_FORMULARIO,
      DAT_INATIVACAO_FORMULARIO: original.DAT_INATIVACAO_FORMULARIO,
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

  // Copiar vínculos de escopo (tribunais/órgãos)
  const escopoOriginal = await prisma.questionarioTribunal.findMany({
    where: { SEQ_QUESTIONARIO: id },
    select: { SEQ_ORGAO: true },
  });
  if (escopoOriginal.length > 0) {
    await prisma.questionarioTribunal.createMany({
      data: escopoOriginal.map(e => ({
        SEQ_ORGAO: e.SEQ_ORGAO,
        SEQ_QUESTIONARIO: novoQ.SEQ_QUESTIONARIO,
      })),
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


// ============================================================================
// CRUD de Perguntas
// ============================================================================

export async function buscarPerguntaCompleta(seqPergunta: number): Promise<PerguntaCompleta | null> {
  const p = await prisma.pergunta.findUnique({
    where: { SEQ_PERGUNTA: seqPergunta },
    include: {
      tipoFormato: true,
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
        SEQ_TIPO_PERIODICIDADE_PERGUNTA: 1,
        SEQ_TIPO_VARIAVEL_PERGUNTA: 1,
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
  // Busca mais resultados para compensar duplicatas de versionamento
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
    take: limite * 5,
  });

  const mapeadas = perguntas.map((p) => ({
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

  // Deduplicar: agrupar por raiz (SEQ_PERGUNTA_BASE ?? SEQ_PERGUNTA)
  // e manter apenas a versão mais recente de cada pergunta
  const porRaiz = new Map<number, PerguntaResumo>();
  for (const p of mapeadas) {
    const raiz = p.SEQ_PERGUNTA_BASE ?? p.SEQ_PERGUNTA;
    const existente = porRaiz.get(raiz);
    if (!existente || p.NUM_VERSAO > existente.NUM_VERSAO) {
      porRaiz.set(raiz, p);
    }
  }

  return Array.from(porRaiz.values()).slice(0, limite);
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
