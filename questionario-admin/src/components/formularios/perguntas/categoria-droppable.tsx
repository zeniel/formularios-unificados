'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FolderOpen, Pencil, Check, X } from 'lucide-react';
import type { CategoriaGrupo } from '@/lib/types/questionario';
import { SortablePergunta } from './sortable-pergunta';

interface CategoriaDroppableProps {
  categoria: CategoriaGrupo;
  canEdit: boolean;
  globalIndexStart: number;
  onRename: (id: number, nome: string) => void;
  onEditPergunta: (seqPergunta: number) => void;
  onDeletePergunta: (seqPergunta: number) => void;
}

export function CategoriaDroppable({
  categoria,
  canEdit,
  globalIndexStart,
  onRename,
  onEditPergunta,
  onDeletePergunta,
}: CategoriaDroppableProps) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(categoria.DSC_CATEGORIA_PERGUNTA);

  const droppableId = `categoria-${categoria.SEQ_CATEGORIA_PERGUNTA ?? 'sem'}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const sortableIds = categoria.perguntas.map((p) => `pergunta-${p.SEQ_PERGUNTA}`);

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50/30' : ''
      }`}
    >
      {/* Header da categoria */}
      {!categoria.SEQ_CATEGORIA_PERGUNTA ? (
        <div className="flex items-center gap-2 py-3 px-4 bg-gray-50 border-b">
          <FolderOpen className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-500 italic">Sem categoria</span>
          <span className="text-xs text-gray-400 ml-auto">
            {categoria.perguntas.length} pergunta{categoria.perguntas.length !== 1 ? 's' : ''}
          </span>
        </div>
      ) : editing ? (
        <div className="flex items-center gap-2 py-2 px-4 bg-blue-50 border-b">
          <FolderOpen className="w-4 h-4 text-blue-500" />
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && nome.trim()) {
                onRename(categoria.SEQ_CATEGORIA_PERGUNTA!, nome.trim());
                setEditing(false);
              }
              if (e.key === 'Escape') {
                setNome(categoria.DSC_CATEGORIA_PERGUNTA);
                setEditing(false);
              }
            }}
            className="flex-1 px-2 py-1 text-sm font-semibold border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={() => {
              if (nome.trim()) {
                onRename(categoria.SEQ_CATEGORIA_PERGUNTA!, nome.trim());
                setEditing(false);
              }
            }}
            className="p-1 text-green-600 hover:bg-green-100 rounded"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setNome(categoria.DSC_CATEGORIA_PERGUNTA); setEditing(false); }}
            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 py-3 px-4 bg-gray-50 border-b group">
          <FolderOpen className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-800">{categoria.DSC_CATEGORIA_PERGUNTA}</span>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="p-1 text-gray-300 hover:text-blue-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Renomear categoria"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            {categoria.perguntas.length} pergunta{categoria.perguntas.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Perguntas da categoria (sortable) */}
      <div ref={setNodeRef} className="divide-y min-h-[2rem]">
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {categoria.perguntas.map((p, i) => (
            <SortablePergunta
              key={p.SEQ_PERGUNTA}
              pergunta={p}
              index={globalIndexStart + i}
              canEdit={canEdit}
              onEdit={onEditPergunta}
              onDelete={onDeletePergunta}
            />
          ))}
        </SortableContext>
        {categoria.perguntas.length === 0 && (
          <div className="py-4 text-center text-sm text-gray-400">
            {canEdit ? 'Arraste perguntas para esta categoria' : 'Nenhuma pergunta'}
          </div>
        )}
      </div>
    </div>
  );
}
