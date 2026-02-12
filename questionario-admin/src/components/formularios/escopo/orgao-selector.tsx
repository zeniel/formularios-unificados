'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Loader2, Building2 } from 'lucide-react';

interface Tribunal {
  seqOrgao: number;
  nome: string;
  sigla: string;
  esfera?: string;
}

interface OrgaoResumo {
  seqOrgao: number;
  dscOrgao: string;
}

interface OrgaoSelectorProps {
  tribunalSelecionado: Tribunal | null;
  onTribunalChange: (tribunal: Tribunal | null) => void;
  orgaosSelecionados: OrgaoResumo[];
  onOrgaosChange: (orgaos: OrgaoResumo[]) => void;
}

export function OrgaoSelector({
  tribunalSelecionado,
  onTribunalChange,
  orgaosSelecionados,
  onOrgaosChange,
}: OrgaoSelectorProps) {
  return (
    <div className="space-y-4">
      <TribunalSearch
        selected={tribunalSelecionado}
        onSelect={onTribunalChange}
      />

      {tribunalSelecionado && (
        <OrgaoSearch
          siglaTribunal={tribunalSelecionado.sigla}
          selecionados={orgaosSelecionados}
          onSelecionar={onOrgaosChange}
        />
      )}
    </div>
  );
}

// ============================================================================
// Pesquisa de Tribunal (autocomplete, single select)
// ============================================================================

function TribunalSearch({
  selected,
  onSelect,
}: {
  selected: Tribunal | null;
  onSelect: (t: Tribunal | null) => void;
}) {
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery<{ success: boolean; data: Tribunal[] }>({
    queryKey: ['corporativo-tribunais'],
    queryFn: async () => {
      const res = await fetch('/api/corporativo/tribunais');
      if (!res.ok) throw new Error('Erro');
      return res.json();
    },
  });

  const tribunais = data?.data ?? [];

  const filtrados = busca.trim()
    ? tribunais.filter(t => {
        const termo = busca.trim().toLowerCase();
        return t.nome.toLowerCase().includes(termo) || t.sigla.toLowerCase().includes(termo);
      }).slice(0, 10)
    : [];

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (selected) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tribunal de Referência *
        </label>
        <div className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-gray-50">
          <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm font-medium text-gray-700">{selected.sigla}</span>
          <span className="text-sm text-gray-500 truncate">{selected.nome}</span>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setBusca('');
            }}
            className="ml-auto p-1 text-gray-400 hover:text-red-500 rounded"
            title="Remover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Tribunal de Referência *
      </label>
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busca}
          onChange={e => {
            setBusca(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          placeholder="Digite a sigla ou nome do tribunal..."
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {aberto && busca.trim() && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtrados.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">Nenhum tribunal encontrado</div>
          ) : (
            filtrados.map(t => (
              <button
                key={t.seqOrgao}
                type="button"
                onClick={() => {
                  onSelect(t);
                  setBusca('');
                  setAberto(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
              >
                <span className="font-mono font-medium text-gray-700">{t.sigla}</span>
                <span className="text-gray-500 truncate">{t.nome}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Pesquisa de Órgãos dentro de um tribunal
// ============================================================================

function OrgaoSearch({
  siglaTribunal,
  selecionados,
  onSelecionar,
}: {
  siglaTribunal: string;
  selecionados: OrgaoResumo[];
  onSelecionar: (orgaos: OrgaoResumo[]) => void;
}) {
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca);
    }, 300);
    return () => clearTimeout(timer);
  }, [busca]);

  const { data, isLoading } = useQuery<{ success: boolean; data: OrgaoResumo[] }>({
    queryKey: ['corporativo-orgaos', siglaTribunal, buscaDebounced],
    queryFn: async () => {
      const params = new URLSearchParams({ tribunal: siglaTribunal });
      if (buscaDebounced.trim()) params.set('busca', buscaDebounced.trim());
      const res = await fetch(`/api/corporativo/orgaos?${params}`);
      if (!res.ok) throw new Error('Erro');
      return res.json();
    },
    enabled: buscaDebounced.trim().length >= 2,
  });

  const resultados = data?.data ?? [];
  const selecionadosIds = new Set(selecionados.map(o => o.seqOrgao));

  function toggleOrgao(orgao: OrgaoResumo) {
    if (selecionadosIds.has(orgao.seqOrgao)) {
      onSelecionar(selecionados.filter(o => o.seqOrgao !== orgao.seqOrgao));
    } else {
      onSelecionar([...selecionados, orgao]);
    }
  }

  function removerOrgao(seqOrgao: number) {
    onSelecionar(selecionados.filter(o => o.seqOrgao !== seqOrgao));
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Órgãos
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Digite o nome do órgão para pesquisar (mín. 2 caracteres)..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Resultados da busca */}
      {buscaDebounced.trim().length >= 2 && (
        <div className="border rounded-lg max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="ml-2 text-xs text-gray-500">Pesquisando...</span>
            </div>
          ) : resultados.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">Nenhum órgão encontrado</div>
          ) : (
            resultados.map(o => {
              const jaSelecionado = selecionadosIds.has(o.seqOrgao);
              return (
                <button
                  key={o.seqOrgao}
                  type="button"
                  onClick={() => toggleOrgao(o)}
                  className={`w-full px-4 py-2 text-left text-sm border-b last:border-b-0 hover:bg-blue-50 ${
                    jaSelecionado ? 'bg-blue-50/50 text-blue-700' : ''
                  }`}
                >
                  {o.dscOrgao}
                  {jaSelecionado && <span className="ml-2 text-xs text-blue-500">(selecionado)</span>}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Lista de selecionados */}
      {selecionados.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">
            {selecionados.length} órgão(s) selecionado(s):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selecionados.map(o => (
              <span
                key={o.seqOrgao}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {o.dscOrgao}
                <button
                  type="button"
                  onClick={() => removerOrgao(o.seqOrgao)}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
