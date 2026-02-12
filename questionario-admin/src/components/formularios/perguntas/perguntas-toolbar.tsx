'use client';

import { Plus, FolderPlus } from 'lucide-react';

interface PerguntasToolbarProps {
  onAdicionarPergunta: () => void;
  onAdicionarCategoria: () => void;
}

export function PerguntasToolbar({
  onAdicionarPergunta,
  onAdicionarCategoria,
}: PerguntasToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onAdicionarPergunta}
        className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Adicionar Pergunta
      </button>
      <button
        onClick={onAdicionarCategoria}
        className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
      >
        <FolderPlus className="w-4 h-4 mr-1.5" />
        Adicionar Categoria
      </button>
    </div>
  );
}
