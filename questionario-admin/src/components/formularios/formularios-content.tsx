'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Upload,
  Copy,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { QuestionarioResumo, StatusPublicacao } from '@/lib/types/questionario';

interface FormulariosContentProps {
  nomPerfil?: string;
}

interface ListagemResponse {
  dados: QuestionarioResumo[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export function FormulariosContent({ nomPerfil }: FormulariosContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const perfilUpper = nomPerfil?.toUpperCase() ?? '';
  const canEdit = perfilUpper === 'ADMINISTRADOR' || perfilUpper === 'PESQUISADOR';

  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusPublicacao | ''>('');
  const [pagina, setPagina] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<number | null>(null);

  const queryKey = ['questionarios', busca, status, pagina];

  const { data, isLoading, error } = useQuery<{ success: boolean; data: ListagemResponse }>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (busca) params.set('busca', busca);
      if (status) params.set('status', status);
      params.set('pagina', String(pagina));
      params.set('porPagina', '20');
      const res = await fetch(`/api/questionarios?${params}`);
      if (!res.ok) throw new Error('Erro ao buscar questionários');
      return res.json();
    },
  });

  const publicarMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/questionarios/${id}/publicar`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao publicar');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionarios'] });
      setConfirmPublish(null);
    },
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/questionarios/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao excluir');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionarios'] });
      setConfirmDelete(null);
    },
  });

  const novaVersaoMutation = useMutation({
    mutationFn: async (id: number) => {
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
      queryClient.invalidateQueries({ queryKey: ['questionarios'] });
    },
  });

  const handleBusca = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
  }, []);

  const resultado = data?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Formulários</h2>
          <p className="text-gray-500 mt-1">
            Gerencie os formulários do sistema
          </p>
        </div>

        {canEdit && (
          <Link
            href="/formularios/novo"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Formulário
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <form onSubmit={handleBusca} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as StatusPublicacao | ''); setPagina(1); }}
            className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="PUBLICADO">Publicado</option>
          </select>
        </form>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="ml-2 text-gray-500">Carregando...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-500">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Erro ao carregar formulários
          </div>
        ) : !resultado || resultado.dados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FileText className="w-12 h-12 text-gray-300 mb-3" />
            <p className="font-medium">Nenhum formulário encontrado</p>
            <p className="text-sm mt-1">
              {busca || status ? 'Tente ajustar os filtros' : 'Crie o primeiro formulário'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Versão</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Perguntas</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Respostas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criado em</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {resultado.dados.map((q) => (
                    <tr key={q.SEQ_QUESTIONARIO} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/formularios/${q.SEQ_QUESTIONARIO}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {q.NOM_QUESTIONARIO}
                        </Link>
                        {q.COD_ESCOPO_RESPOSTA && (
                          <span className="ml-2 text-xs text-gray-400">{q.COD_ESCOPO_RESPOSTA}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={q.DSC_STATUS === 'RASCUNHO' ? 'badge-rascunho' : 'badge-publicado'}>
                          {q.DSC_STATUS === 'RASCUNHO' ? 'Rascunho' : 'Publicado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">v{q.NUM_VERSAO}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{q.QTD_PERGUNTAS}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{q.QTD_RESPOSTAS.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(q.DAT_CRIACAO_QUESTIONARIO)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/formularios/${q.SEQ_QUESTIONARIO}`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {canEdit && q.DSC_STATUS === 'RASCUNHO' && (
                            <Link
                              href={`/formularios/${q.SEQ_QUESTIONARIO}/editar`}
                              className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                          )}

                          {canEdit && q.DSC_STATUS === 'RASCUNHO' && (
                            <button
                              onClick={() => setConfirmPublish(q.SEQ_QUESTIONARIO)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"
                              title="Publicar"
                              disabled={publicarMutation.isPending}
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          )}

                          {canEdit && q.DSC_STATUS === 'PUBLICADO' && (
                            <button
                              onClick={() => novaVersaoMutation.mutate(q.SEQ_QUESTIONARIO)}
                              className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                              title="Nova versão"
                              disabled={novaVersaoMutation.isPending}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}

                          {canEdit && q.DSC_STATUS === 'RASCUNHO' && (
                            <button
                              onClick={() => setConfirmDelete(q.SEQ_QUESTIONARIO)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                              title="Excluir"
                              disabled={excluirMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {resultado.totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-500">
                  {resultado.total} formulário{resultado.total !== 1 ? 's' : ''} encontrado{resultado.total !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    className="p-1.5 rounded-lg border text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {resultado.pagina} de {resultado.totalPaginas}
                  </span>
                  <button
                    onClick={() => setPagina(p => Math.min(resultado.totalPaginas, p + 1))}
                    disabled={pagina === resultado.totalPaginas}
                    className="p-1.5 rounded-lg border text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Excluir formulário</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir este formulário? Esta ação não pode ser desfeita.
            </p>
            {excluirMutation.error && (
              <p className="text-sm text-red-600 mb-4">
                {excluirMutation.error instanceof Error ? excluirMutation.error.message : 'Erro ao excluir'}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmDelete(null); excluirMutation.reset(); }}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirMutation.mutate(confirmDelete)}
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
      {confirmPublish !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-full">
                <Upload className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold">Publicar formulário</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Após publicar, o formulário e suas perguntas ficarão imutáveis. Para fazer alterações, será necessário criar uma nova versão.
            </p>
            {publicarMutation.error && (
              <p className="text-sm text-red-600 mb-4">
                {publicarMutation.error instanceof Error ? publicarMutation.error.message : 'Erro ao publicar'}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmPublish(null); publicarMutation.reset(); }}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => publicarMutation.mutate(confirmPublish)}
                disabled={publicarMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {publicarMutation.isPending ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback de nova versão */}
      {novaVersaoMutation.error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg shadow-lg z-50">
          {novaVersaoMutation.error instanceof Error ? novaVersaoMutation.error.message : 'Erro ao criar nova versão'}
        </div>
      )}
    </div>
  );
}
