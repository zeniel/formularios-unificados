'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { PerguntaResumo } from '@/lib/types/questionario';

interface PerguntaTemplateSearchProps {
  onSelect: (pergunta: PerguntaResumo) => void;
}

export function PerguntaTemplateSearch({ onSelect }: PerguntaTemplateSearchProps) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<PerguntaResumo[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (busca.trim().length < 2) {
      setResultados([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/perguntas/buscar?q=${encodeURIComponent(busca.trim())}`);
        if (res.ok) {
          const json = await res.json();
          setResultados(json.data || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [busca]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Buscar pergunta existente como modelo
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Digite pelo menos 2 caracteres..."
          className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {resultados.length > 0 && (
        <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
          {resultados.map((p) => (
            <button
              key={p.SEQ_PERGUNTA}
              type="button"
              onClick={() => {
                onSelect(p);
                setBusca('');
                setResultados([]);
              }}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
            >
              <div className="font-medium text-gray-900 line-clamp-1">
                {p.COD_PERGUNTA && (
                  <span className="text-blue-600 font-mono mr-1.5">{p.COD_PERGUNTA}</span>
                )}
                {p.DSC_PERGUNTA}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {p.DSC_TIPO_FORMATO_RESPOSTA} | {p.DSC_CATEGORIA_PERGUNTA || 'Sem categoria'}
              </div>
            </button>
          ))}
        </div>
      )}

      {busca.trim().length >= 2 && !loading && resultados.length === 0 && (
        <p className="text-xs text-gray-400">Nenhuma pergunta encontrada</p>
      )}
    </div>
  );
}
