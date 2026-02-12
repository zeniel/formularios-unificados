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
  FileText,
  Calendar,
  Hash,
  Info,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { QuestionarioCompleto } from '@/lib/types/questionario';
import { isEditavel } from '@/lib/types/questionario';

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
      router.push('/formularios');
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
        <Link href="/formularios" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/formularios"
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
                disabled={novaVersaoMutation.isPending}
                className="inline-flex items-center px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
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
              <dt className="text-sm text-gray-500">Periodicidade</dt>
              <dd className="text-sm font-medium">{q.DSC_TIPO_PERIODICIDADE}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Escopo</dt>
              <dd className="text-sm font-medium">{q.COD_ESCOPO_RESPOSTA || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Mês Limite</dt>
              <dd className="text-sm font-medium">{q.NUM_MES_LIMITE}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Dia Limite</dt>
              <dd className="text-sm font-medium">{q.NUM_DIA_LIMITE ?? '-'}</dd>
            </div>
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
            Datas e Versões
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
            {q.SEQ_QUESTIONARIO_BASE && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Versão base</dt>
                <dd className="text-sm">
                  <Link href={`/formularios/${q.SEQ_QUESTIONARIO_BASE}`} className="text-blue-600 hover:underline">
                    #{q.SEQ_QUESTIONARIO_BASE}
                  </Link>
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Total de perguntas</dt>
              <dd className="text-sm font-medium">{q.QTD_PERGUNTAS}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Total de respostas</dt>
              <dd className="text-sm font-medium">{q.QTD_RESPOSTAS.toLocaleString('pt-BR')}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Lista de perguntas */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Hash className="w-5 h-5 text-orange-500" />
            Perguntas ({q.perguntas.length})
          </h3>
        </div>
        <div className="card-content">
          {q.perguntas.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-500">
              <FileText className="w-10 h-10 text-gray-300 mb-2" />
              <p>Nenhuma pergunta cadastrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {q.perguntas.map((p, index) => (
                <div key={p.SEQ_PERGUNTA} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border">
                  <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.DSC_PERGUNTA}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {p.COD_PERGUNTA && (
                        <span className="text-xs text-gray-400">{p.COD_PERGUNTA}</span>
                      )}
                      <span className="text-xs text-gray-400">{p.DSC_TIPO_FORMATO_RESPOSTA}</span>
                      {p.DSC_CATEGORIA_PERGUNTA && (
                        <span className="text-xs text-blue-500">{p.DSC_CATEGORIA_PERGUNTA}</span>
                      )}
                      <span className="text-xs text-gray-400">{p.QTD_RESPOSTAS} resp.</span>
                    </div>
                  </div>
                  <span className={p.DSC_STATUS === 'RASCUNHO' ? 'badge-rascunho' : 'badge-publicado'}>
                    {p.DSC_STATUS === 'RASCUNHO' ? 'Rascunho' : 'Publicado'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
