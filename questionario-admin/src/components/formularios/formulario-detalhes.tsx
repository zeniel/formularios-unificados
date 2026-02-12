'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Upload,
  Copy,
  Trash2,
  Loader2,
  AlertTriangle,
  Calendar,
  Info,
  HelpCircle,
} from 'lucide-react';
import { formatDateTime, formatDate } from '@/lib/utils';
import type { QuestionarioCompleto } from '@/lib/types/questionario';
import { isEditavel } from '@/lib/types/questionario';

// Nomes dos meses em pt-BR
const NOMES_MESES = [
  '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function getTextoPrazo(q: QuestionarioCompleto): { resumo: string; ajuda: string } {
  const dia = q.NUM_DIA_LIMITE ? `dia ${q.NUM_DIA_LIMITE}` : 'último dia';
  const cod = q.SEQ_TIPO_PERIODICIDADE_PERGUNTA;

  switch (cod) {
    case 1: // Mensal
      return {
        resumo: `Até ${dia} do mês seguinte`,
        ajuda: `Prazo até ${dia} do mês seguinte ao período de referência.`,
      };
    case 2: // Semestral
      return {
        resumo: `Até ${dia} do 1\u00BA mês do semestre seguinte (jan ou jul)`,
        ajuda: `Prazo até ${dia} do 1\u00BA mês do semestre seguinte. Meses possíveis: janeiro, julho.`,
      };
    case 3: { // Anual
      const mes = NOMES_MESES[q.NUM_MES_LIMITE ?? 0] || `mês ${q.NUM_MES_LIMITE}`;
      return {
        resumo: `Até ${dia} de ${mes} do ano seguinte`,
        ajuda: `Prazo até ${dia} de ${mes} do ano seguinte ao período de referência.`,
      };
    }
    case 4: // Trimestral
      return {
        resumo: `Até ${dia} do 1\u00BA mês do trimestre seguinte (jan, abr, jul ou out)`,
        ajuda: `Prazo até ${dia} do 1\u00BA mês do trimestre seguinte. Meses possíveis: janeiro, abril, julho, outubro.`,
      };
    default:
      return {
        resumo: q.NUM_DIA_LIMITE ? `Dia ${q.NUM_DIA_LIMITE}, mês ${q.NUM_MES_LIMITE}` : '-',
        ajuda: '',
      };
  }
}

function getAjudaPeriodicidade(cod: number): string {
  switch (cod) {
    case 1: return 'Os dados devem ser enviados todo mês. O mês limite é sempre o mês corrente.';
    case 2: return 'Os dados devem ser enviados a cada semestre. Períodos: jan-jun e jul-dez.';
    case 3: return 'Os dados devem ser enviados uma vez por ano, referentes ao ano anterior.';
    case 4: return 'Os dados devem ser enviados a cada trimestre. Períodos: jan-mar, abr-jun, jul-set, out-dez.';
    default: return '';
  }
}
// Nomes dos meses em pt-BR (capitalizados, para exibição)
const NOMES_MESES_CAP = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

function calcularPeriodoReferencia(q: QuestionarioCompleto): { periodoRef: string; dataLimite: string } | null {
  if (q.SEQ_TIPO_PERIODICIDADE_PERGUNTA === null) return null;

  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth() + 1; // 1-12
  const cod = q.SEQ_TIPO_PERIODICIDADE_PERGUNTA;

  function formatarDataLimite(ano: number, mes: number, dia: number | null): string {
    const ultimoDia = ultimoDiaDoMes(ano, mes);
    const d = (dia === null || dia < 1 || dia > 31) ? ultimoDia : Math.min(dia, ultimoDia);
    return `${String(d).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
  }

  switch (cod) {
    case 1: { // Mensal - período de referência = mês anterior
      let mesRef = mesAtual - 1;
      let anoRef = anoAtual;
      if (mesRef === 0) { mesRef = 12; anoRef = anoAtual - 1; }
      return {
        periodoRef: `${NOMES_MESES_CAP[mesRef]}/${anoRef}`,
        dataLimite: formatarDataLimite(anoAtual, mesAtual, q.NUM_DIA_LIMITE),
      };
    }
    case 2: { // Semestral - período = semestre anterior
      const semestreAtual = mesAtual <= 6 ? 1 : 2;
      if (semestreAtual === 1) {
        // Estamos no 1o semestre, ref = 2o semestre do ano anterior
        return {
          periodoRef: `2\u00BA Semestre/${anoAtual - 1}`,
          dataLimite: formatarDataLimite(anoAtual, 1, q.NUM_DIA_LIMITE),
        };
      } else {
        // Estamos no 2o semestre, ref = 1o semestre do ano atual
        return {
          periodoRef: `1\u00BA Semestre/${anoAtual}`,
          dataLimite: formatarDataLimite(anoAtual, 7, q.NUM_DIA_LIMITE),
        };
      }
    }
    case 3: { // Anual - período = ano anterior
      return {
        periodoRef: `${anoAtual - 1}`,
        dataLimite: formatarDataLimite(anoAtual, q.NUM_MES_LIMITE ?? 1, q.NUM_DIA_LIMITE),
      };
    }
    case 4: { // Trimestral - período = trimestre anterior
      const trimestreAtual = Math.ceil(mesAtual / 3);
      const primeiroMesTrimestreAtual = (trimestreAtual - 1) * 3 + 1;
      let trimestreRef = trimestreAtual - 1;
      let anoRef = anoAtual;
      if (trimestreRef === 0) { trimestreRef = 4; anoRef = anoAtual - 1; }
      return {
        periodoRef: `${trimestreRef}\u00BA Trimestre/${anoRef}`,
        dataLimite: formatarDataLimite(anoAtual, primeiroMesTrimestreAtual, q.NUM_DIA_LIMITE),
      };
    }
    default:
      return null;
  }
}

function getStatusSobDemanda(q: QuestionarioCompleto): { label: string; ativo: boolean } {
  const agora = new Date();
  const ativacao = q.DAT_ATIVACAO_FORMULARIO ? new Date(q.DAT_ATIVACAO_FORMULARIO) : null;
  const inativacao = q.DAT_INATIVACAO_FORMULARIO ? new Date(q.DAT_INATIVACAO_FORMULARIO) : null;

  if (!ativacao) return { label: 'Sem data definida', ativo: false };
  if (agora < ativacao) return { label: 'Aguardando ativação', ativo: false };
  if (inativacao && agora > inativacao) return { label: 'Encerrado', ativo: false };
  return { label: 'Ativo', ativo: true };
}

import { PerguntasSection } from './perguntas/perguntas-section';

interface FormularioDetalhesProps {
  id: number;
  nomPerfil?: string;
}

export function FormularioDetalhes({ id, nomPerfil }: FormularioDetalhesProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const perfilUpper = nomPerfil?.toUpperCase() ?? '';
  const canEdit = perfilUpper === 'ADMINISTRADOR' || perfilUpper === 'PESQUISADOR';

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const { data, isLoading, error } = useQuery<{ success: boolean; data: QuestionarioCompleto }>({
    queryKey: ['questionario', id],
    queryFn: async () => {
      const res = await fetch(`/api/questionarios/${id}`);
      if (!res.ok) throw new Error('Erro ao buscar questionário');
      return res.json();
    },
  });

  const publicarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/questionarios/${id}/publicar`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao publicar');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionario', id] });
      setConfirmPublish(false);
    },
  });

  const excluirMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/questionarios/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao excluir');
      }
    },
    onSuccess: () => {
      const tipo = data?.data?.SEQ_TIPO_PERIODICIDADE_PERGUNTA === null ? 'sob-demanda' : 'periodicos';
      router.push(`/formularios/${tipo}`);
    },
  });

  const novaVersaoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/questionarios/${id}/nova-versao`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao criar nova versão');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.data?.SEQ_QUESTIONARIO) {
        router.push(`/formularios/${data.data.SEQ_QUESTIONARIO}`);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-500">Carregando...</span>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="space-y-4">
        <Link href="/formularios/periodicos" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Link>
        <div className="flex items-center justify-center py-12 text-red-500">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Questionário não encontrado
        </div>
      </div>
    );
  }

  const q = data.data;
  const editavel = isEditavel(q.DSC_STATUS);
  const isSobDemanda = q.SEQ_TIPO_PERIODICIDADE_PERGUNTA === null;
  const voltarHref = isSobDemanda ? '/formularios/sob-demanda' : '/formularios/periodicos';
  const periodoRef = !isSobDemanda ? calcularPeriodoReferencia(q) : null;
  const statusSobDemanda = isSobDemanda ? getStatusSobDemanda(q) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={voltarHref}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{q.NOM_QUESTIONARIO}</h2>
              <span className={q.DSC_STATUS === 'RASCUNHO' ? 'badge-rascunho' : 'badge-publicado'}>
                {q.DSC_STATUS === 'RASCUNHO' ? 'Rascunho' : 'Publicado'}
              </span>
              <span className="text-sm text-gray-400">v{q.NUM_VERSAO}</span>
            </div>
            <p className="text-gray-500 mt-1">{q.DSC_QUESTIONARIO}</p>
          </div>
        </div>

        {/* Ações */}
        {canEdit && (
          <div className="flex items-center gap-2">
            {editavel && (
              <Link
                href={`/formularios/${q.SEQ_QUESTIONARIO}/editar`}
                className="inline-flex items-center px-3 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="w-4 h-4 mr-1.5" />
                Editar
              </Link>
            )}

            {editavel && (
              <button
                onClick={() => setConfirmPublish(true)}
                className="inline-flex items-center px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Publicar
              </button>
            )}

            {!editavel && (
              <button
                onClick={() => novaVersaoMutation.mutate()}
                disabled={novaVersaoMutation.isPending || q.TEM_RASCUNHO}
                className="inline-flex items-center px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                title={q.TEM_RASCUNHO ? 'Já existe versão em rascunho' : undefined}
              >
                {novaVersaoMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Copy className="w-4 h-4 mr-1.5" />
                )}
                Nova Versão
              </button>
            )}

            {editavel && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Excluir
              </button>
            )}
          </div>
        )}
      </div>

      {/* Erro de nova versão */}
      {novaVersaoMutation.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {novaVersaoMutation.error instanceof Error ? novaVersaoMutation.error.message : 'Erro'}
        </div>
      )}

      {/* Informações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Informações Gerais
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Escopo</dt>
              <dd className="text-sm font-medium flex items-center gap-1">
                {q.DSC_TIPO_ESCOPO || q.COD_ESCOPO_RESPOSTA || '-'}
                {q.DSC_DETALHES && (
                  <span title={q.DSC_DETALHES}>
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  </span>
                )}
              </dd>
            </div>

            {q.escopoOrgaos.length > 0 && (
              <div>
                <dt className="text-sm text-gray-500 mb-1">
                  {q.COD_ESCOPO_RESPOSTA === 'TRIBUNAL' ? 'Tribunais' : 'Órgãos'} vinculados ({q.escopoOrgaos.length})
                </dt>
                <dd className="text-xs text-gray-600">
                  {q.escopoOrgaos.map(id => `#${id}`).join(', ')}
                </dd>
              </div>
            )}

            {!isSobDemanda ? (
              <>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 flex items-center gap-1">
                    Periodicidade
                    {getAjudaPeriodicidade(q.SEQ_TIPO_PERIODICIDADE_PERGUNTA!) && (
                      <span title={getAjudaPeriodicidade(q.SEQ_TIPO_PERIODICIDADE_PERGUNTA!)}>
                        <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                      </span>
                    )}
                  </dt>
                  <dd className="text-sm font-medium">{q.DSC_TIPO_PERIODICIDADE}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 flex items-center gap-1">
                    Prazo
                    {getTextoPrazo(q).ajuda && (
                      <span title={getTextoPrazo(q).ajuda}>
                        <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                      </span>
                    )}
                  </dt>
                  <dd className="text-sm font-medium">{getTextoPrazo(q).resumo}</dd>
                </div>
                {periodoRef && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Período de Referência Atual</dt>
                      <dd className="text-sm font-medium">{periodoRef.periodoRef}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Data Limite de Preenchimento</dt>
                      <dd className="text-sm font-medium">{periodoRef.dataLimite}</dd>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Tipo</dt>
                  <dd className="text-sm font-medium">Sob Demanda</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Ativação</dt>
                  <dd className="text-sm font-medium">
                    {q.DAT_ATIVACAO_FORMULARIO ? formatDate(q.DAT_ATIVACAO_FORMULARIO) : '-'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Inativação</dt>
                  <dd className="text-sm font-medium">
                    {q.DAT_INATIVACAO_FORMULARIO ? formatDate(q.DAT_INATIVACAO_FORMULARIO) : 'Indefinida'}
                  </dd>
                </div>
                {statusSobDemanda && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Disponibilidade</dt>
                    <dd>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusSobDemanda.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {statusSobDemanda.label}
                      </span>
                    </dd>
                  </div>
                )}
              </>
            )}

            {q.DSC_OBSERVACAO_QUESTIONARIO && (
              <div>
                <dt className="text-sm text-gray-500 mb-1">Observação</dt>
                <dd className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {q.DSC_OBSERVACAO_QUESTIONARIO}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            Datas e Estatísticas
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Criado em</dt>
              <dd className="text-sm font-medium">{formatDateTime(q.DAT_CRIACAO_QUESTIONARIO)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Publicado em</dt>
              <dd className="text-sm font-medium">{q.DAT_PUBLICACAO ? formatDateTime(q.DAT_PUBLICACAO) : '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Versão</dt>
              <dd className="text-sm font-medium">v{q.NUM_VERSAO}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Categorias</dt>
              <dd className="text-sm font-medium">{q.QTD_CATEGORIAS}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Perguntas</dt>
              <dd className="text-sm font-medium">{q.QTD_PERGUNTAS}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Respostas</dt>
              <dd className="text-sm font-medium">{q.QTD_RESPOSTAS.toLocaleString('pt-BR')}</dd>
            </div>
          </dl>

          {/* Versões deste formulário */}
          {q.versoes.length > 0 && (
            <div className="pt-3 border-t">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Versões deste formulário</h4>
              <ul className="space-y-1">
                {q.versoes.map((v) => (
                  <li key={v.SEQ_QUESTIONARIO} className="flex items-center justify-between text-sm">
                    <Link
                      href={`/formularios/${v.SEQ_QUESTIONARIO}`}
                      className="text-blue-600 hover:underline"
                    >
                      v{v.NUM_VERSAO}
                    </Link>
                    <span className="text-gray-400">
                      {v.DAT_PUBLICACAO ? formatDate(v.DAT_PUBLICACAO) : '-'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Perguntas com CRUD e drag-and-drop */}
      <PerguntasSection
        questionarioId={q.SEQ_QUESTIONARIO}
        categorias={q.categorias}
        qtdPerguntas={q.QTD_PERGUNTAS}
        qtdCategorias={q.QTD_CATEGORIAS}
        editavel={editavel}
        canEdit={canEdit}
      />

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Excluir formulário</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir <strong>{q.NOM_QUESTIONARIO}</strong>? Esta ação não pode ser desfeita.
            </p>
            {excluirMutation.error && (
              <p className="text-sm text-red-600 mb-4">
                {excluirMutation.error instanceof Error ? excluirMutation.error.message : 'Erro ao excluir'}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmDelete(false); excluirMutation.reset(); }}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirMutation.mutate()}
                disabled={excluirMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {excluirMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de publicação */}
      {confirmPublish && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-full">
                <Upload className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold">Publicar formulário</h3>
            </div>
            <p className="text-gray-600 mb-2">
              Publicar <strong>{q.NOM_QUESTIONARIO}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Após publicar, o formulário e suas {q.QTD_PERGUNTAS} pergunta{q.QTD_PERGUNTAS !== 1 ? 's' : ''} ficarão imutáveis.
              Para fazer alterações, será necessário criar uma nova versão.
            </p>
            {publicarMutation.error && (
              <p className="text-sm text-red-600 mb-4">
                {publicarMutation.error instanceof Error ? publicarMutation.error.message : 'Erro ao publicar'}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmPublish(false); publicarMutation.reset(); }}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => publicarMutation.mutate()}
                disabled={publicarMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {publicarMutation.isPending ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
