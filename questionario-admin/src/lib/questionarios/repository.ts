// src/lib/questionarios/repository.ts
// Camada de dados para CRUD de questionários

import { prisma } from '@/lib/db';
import type {
  QuestionarioResumo,
  QuestionarioCompleto,
  CriarQuestionarioInput,
  EditarQuestionarioInput,
  StatusPublicacao,
  PerguntaResumo,
} from '@/lib/types/questionario';

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
            perguntas: true,
            respostas: true,
          },
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
    QTD_PERGUNTAS: q._count.perguntas,
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
      perguntas: {
        orderBy: { NUM_ORDEM: 'asc' },
        include: {
          tipoFormato: true,
          categoria: true,
          _count: {
            select: { respostas: true },
          },
        },
      },
      _count: {
        select: {
          perguntas: true,
          respostas: true,
        },
      },
    },
  });

  if (!q) return null;

  const perguntas: PerguntaResumo[] = q.perguntas.map(p => ({
    SEQ_PERGUNTA: p.SEQ_PERGUNTA,
    DSC_PERGUNTA: p.DSC_PERGUNTA,
    COD_PERGUNTA: p.COD_PERGUNTA,
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
    QTD_PERGUNTAS: q._count.perguntas,
    QTD_RESPOSTAS: q._count.respostas,
    perguntas,
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

  // Remover perguntas vinculadas e depois o questionário
  await prisma.$transaction([
    prisma.pergunta.deleteMany({ where: { SEQ_QUESTIONARIO: id } }),
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

  // Publicar questionário + cascata nas perguntas
  await prisma.$transaction([
    prisma.questionario.update({
      where: { SEQ_QUESTIONARIO: id },
      data: {
        DSC_STATUS: 'PUBLICADO',
        DAT_PUBLICACAO: agora,
        USU_PUBLICACAO: usuario,
      },
    }),
    prisma.pergunta.updateMany({
      where: {
        SEQ_QUESTIONARIO: id,
        DSC_STATUS: 'RASCUNHO',
      },
      data: {
        DSC_STATUS: 'PUBLICADO',
        DAT_PUBLICACAO: agora,
        USU_PUBLICACAO: usuario,
      },
    }),
  ]);
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
    include: {
      perguntas: true,
    },
  });

  if (!original) {
    throw new Error('Questionário não encontrado');
  }

  if (original.DSC_STATUS !== 'PUBLICADO') {
    throw new Error('Apenas questionários PUBLICADOS podem gerar nova versão');
  }

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

  // Copiar perguntas
  if (original.perguntas.length > 0) {
    for (const p of original.perguntas) {
      const seqPerguntaRaiz = p.SEQ_PERGUNTA_BASE ?? p.SEQ_PERGUNTA;
      await prisma.pergunta.create({
        data: {
          SEQ_PERGUNTA_BASE: seqPerguntaRaiz,
          NUM_VERSAO: p.NUM_VERSAO + 1,
          DSC_STATUS: 'RASCUNHO',
          SEQ_QUESTIONARIO: novoQ.SEQ_QUESTIONARIO,
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
    }
  }

  return novoQ.SEQ_QUESTIONARIO;
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
