'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, FolderPlus } from 'lucide-react';

interface CategoriaFormModalProps {
  questionarioId: number;
  open: boolean;
  onClose: () => void;
}

export function CategoriaFormModal({
  questionarioId,
  open,
  onClose,
}: CategoriaFormModalProps) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');

  const mutation = useMutation({
    mutationFn: async (dscCategoria: string) => {
      const res = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ DSC_CATEGORIA_PERGUNTA: dscCategoria }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao criar categoria');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionario', questionarioId] });
      setNome('');
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-full">
            <FolderPlus className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold">Nova Categoria</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da categoria *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Dados Gerais"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nome.trim()) {
                  mutation.mutate(nome.trim());
                }
              }}
            />
          </div>

          {mutation.error && (
            <p className="text-sm text-red-600">
              {mutation.error instanceof Error ? mutation.error.message : 'Erro'}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => { setNome(''); mutation.reset(); onClose(); }}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => nome.trim() && mutation.mutate(nome.trim())}
            disabled={!nome.trim() || mutation.isPending}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin inline" /> Criando...</>
            ) : (
              'Criar Categoria'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
