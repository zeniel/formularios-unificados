'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, Loader2, CheckSquare, Square } from 'lucide-react';

interface Tribunal {
  seqOrgao: number;
  nome: string;
  sigla: string;
  esfera?: string;
  ufs: string[];
}

interface TribunalSelectorModalProps {
  selectedIds: number[];
  onConfirm: (ids: number[]) => void;
  onClose: () => void;
}

const ESFERAS = [
  { value: '', label: 'Todas' },
  { value: 'ESTADUAL', label: 'Estadual' },
  { value: 'FEDERAL', label: 'Federal' },
  { value: 'TRABALHO', label: 'Trabalho' },
  { value: 'ELEITORAL', label: 'Eleitoral' },
  { value: 'MILITAR', label: 'Militar' },
  { value: 'SUPERIOR', label: 'Superior' },
];

export function TribunalSelectorModal({ selectedIds, onConfirm, onClose }: TribunalSelectorModalProps) {
  const [busca, setBusca] = useState('');
  const [esfera, setEsfera] = useState('');
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set(selectedIds));

  const { data, isLoading } = useQuery<{ success: boolean; data: Tribunal[] }>({
    queryKey: ['corporativo-tribunais'],
    queryFn: async () => {
      const res = await fetch('/api/corporativo/tribunais');
      if (!res.ok) throw new Error('Erro ao carregar tribunais');
      return res.json();
    },
  });

  const tribunais = data?.data ?? [];

  const filtrados = useMemo(() => {
    let resultado = tribunais;

    if (esfera) {
      resultado = resultado.filter(t => t.esfera === esfera);
    }

    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      resultado = resultado.filter(t =>
        t.nome.toLowerCase().includes(termo) ||
        t.sigla.toLowerCase().includes(termo)
      );
    }

    return resultado;
  }, [tribunais, busca, esfera]);

  function toggleTribunal(seqOrgao: number) {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(seqOrgao)) {
        next.delete(seqOrgao);
      } else {
        next.add(seqOrgao);
      }
      return next;
    });
  }

  function toggleTodos() {
    const todosVisiveis = filtrados.map(t => t.seqOrgao);
    const todosJaSelecionados = todosVisiveis.every(id => selecionados.has(id));

    setSelecionados(prev => {
      const next = new Set(prev);
      if (todosJaSelecionados) {
        todosVisiveis.forEach(id => next.delete(id));
      } else {
        todosVisiveis.forEach(id => next.add(id));
      }
      return next;
    });
  }

  const todosVisivelSelecionados = filtrados.length > 0 && filtrados.every(t => selecionados.has(t.seqOrgao));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Selecionar Tribunais
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-6 py-3 border-b bg-gray-50 flex gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou sigla..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <select
            value={esfera}
            onChange={e => setEsfera(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ESFERAS.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Carregando tribunais...</span>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">
              Nenhum tribunal encontrado
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-10 px-3 py-2 text-left">
                    <button
                      type="button"
                      onClick={toggleTodos}
                      className="text-gray-500 hover:text-blue-600"
                      title={todosVisivelSelecionados ? 'Desmarcar todos' : 'Selecionar todos'}
                    >
                      {todosVisivelSelecionados ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">Sigla</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">Nome</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">Esfera</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(t => {
                  const selected = selecionados.has(t.seqOrgao);
                  return (
                    <tr
                      key={t.seqOrgao}
                      onClick={() => toggleTribunal(t.seqOrgao)}
                      className={`cursor-pointer border-b hover:bg-blue-50 ${selected ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="px-3 py-2">
                        {selected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs font-medium text-gray-700">{t.sigla}</td>
                      <td className="px-3 py-2 text-gray-800">{t.nome}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{t.esfera ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
          <span className="text-sm text-gray-500">
            {selecionados.size} tribunal(is) selecionado(s)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(Array.from(selecionados))}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
