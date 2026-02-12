'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Hash, FileText, Trash2, Loader2 } from 'lucide-react';
import type { CategoriaGrupo } from '@/lib/types/questionario';
import { CategoriaDroppable } from './categoria-droppable';
import { PerguntasToolbar } from './perguntas-toolbar';
import { PerguntaFormModal } from './pergunta-form-modal';
import { CategoriaFormModal } from './categoria-form-modal';
import { usePerguntasDnd } from './use-perguntas-dnd';

interface PerguntasSectionProps {
  questionarioId: number;
  categorias: CategoriaGrupo[];
  qtdPerguntas: number;
  qtdCategorias: number;
  editavel: boolean;
  canEdit: boolean;
}

export function PerguntasSection({
  questionarioId,
  categorias,
  qtdPerguntas,
  qtdCategorias,
  editavel,
  canEdit,
}: PerguntasSectionProps) {
  const queryClient = useQueryClient();
  const showControls = canEdit && editavel;

  // Modal state
  const [perguntaModalOpen, setPerguntaModalOpen] = useState(false);
  const [editingPerguntaId, setEditingPerguntaId] = useState<number | null>(null);
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [confirmDeletePergunta, setConfirmDeletePergunta] = useState<number | null>(null);

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const { handleDragStart, handleDragOver, handleDragEnd, reorderError } = usePerguntasDnd(
    questionarioId,
    categorias
  );

  // Rename category mutation
  const renameCategoriaMutation = useMutation({
    mutationFn: async ({ catId, nome }: { catId: number; nome: string }) => {
      const res = await fetch(`/api/categorias/${catId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ DSC_CATEGORIA_PERGUNTA: nome }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao renomear');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionario', questionarioId] });
    },
  });

  // Delete pergunta mutation
  const deletePerguntaMutation = useMutation({
    mutationFn: async (seqPergunta: number) => {
      const res = await fetch(
        `/api/questionarios/${questionarioId}/perguntas/${seqPergunta}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao excluir');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionario', questionarioId] });
      setConfirmDeletePergunta(null);
    },
  });

  function handleEditPergunta(seqPergunta: number) {
    setEditingPerguntaId(seqPergunta);
    setPerguntaModalOpen(true);
  }

  function handleDeletePergunta(seqPergunta: number) {
    setConfirmDeletePergunta(seqPergunta);
  }

  function handleNewPergunta() {
    setEditingPerguntaId(null);
    setPerguntaModalOpen(true);
  }

  // Calculate global index per pergunta
  let globalIndex = 0;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Hash className="w-5 h-5 text-orange-500" />
          Perguntas ({qtdPerguntas})
          {qtdCategorias > 0 && (
            <span className="text-sm font-normal text-gray-400">
              em {qtdCategorias} categoria{qtdCategorias !== 1 ? 's' : ''}
            </span>
          )}
        </h3>
        {showControls && (
          <PerguntasToolbar
            onAdicionarPergunta={handleNewPergunta}
            onAdicionarCategoria={() => setCategoriaModalOpen(true)}
          />
        )}
      </div>

      <div className="card-content">
        {categorias.length === 0 && qtdPerguntas === 0 ? (
          <div className="flex flex-col items-center py-8 text-gray-500">
            <FileText className="w-10 h-10 text-gray-300 mb-2" />
            <p>Nenhuma pergunta cadastrada</p>
            {showControls && (
              <button
                onClick={handleNewPergunta}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800"
              >
                Adicionar a primeira pergunta
              </button>
            )}
          </div>
        ) : showControls ? (
          /* DnD enabled for RASCUNHO + canEdit */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-4">
              {categorias.map((cat) => {
                const startIdx = globalIndex + 1;
                globalIndex += cat.perguntas.length;
                return (
                  <CategoriaDroppable
                    key={cat.SEQ_CATEGORIA_PERGUNTA ?? 'sem-categoria'}
                    categoria={cat}
                    canEdit={showControls}
                    globalIndexStart={startIdx}
                    onRename={(catId, nome) => renameCategoriaMutation.mutate({ catId, nome })}
                    onEditPergunta={handleEditPergunta}
                    onDeletePergunta={handleDeletePergunta}
                  />
                );
              })}
            </div>
          </DndContext>
        ) : (
          /* Read-only mode */
          <div className="space-y-4">
            {categorias.map((cat) => {
              const startIdx = globalIndex + 1;
              globalIndex += cat.perguntas.length;
              return (
                <CategoriaDroppable
                  key={cat.SEQ_CATEGORIA_PERGUNTA ?? 'sem-categoria'}
                  categoria={cat}
                  canEdit={false}
                  globalIndexStart={startIdx}
                  onRename={(catId, nome) => renameCategoriaMutation.mutate({ catId, nome })}
                  onEditPergunta={() => {}}
                  onDeletePergunta={() => {}}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Error toasts */}
      {(renameCategoriaMutation.error || reorderError) && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg shadow-lg z-50">
          {renameCategoriaMutation.error instanceof Error
            ? renameCategoriaMutation.error.message
            : reorderError instanceof Error
            ? reorderError.message
            : 'Erro'}
        </div>
      )}

      {/* Pergunta form modal */}
      <PerguntaFormModal
        questionarioId={questionarioId}
        perguntaId={editingPerguntaId}
        categorias={categorias}
        open={perguntaModalOpen}
        onClose={() => {
          setPerguntaModalOpen(false);
          setEditingPerguntaId(null);
        }}
      />

      {/* Categoria form modal */}
      <CategoriaFormModal
        questionarioId={questionarioId}
        open={categoriaModalOpen}
        onClose={() => setCategoriaModalOpen(false)}
      />

      {/* Confirm delete modal */}
      {confirmDeletePergunta !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Excluir pergunta</h3>
            </div>
            <p className="text-gray-600 mb-2">
              Tem certeza que deseja excluir esta pergunta?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Se a pergunta tiver respostas, ela será desvinculada do formulário (soft delete).
              Caso contrário, será excluída permanentemente.
            </p>
            {deletePerguntaMutation.error && (
              <p className="text-sm text-red-600 mb-4">
                {deletePerguntaMutation.error instanceof Error
                  ? deletePerguntaMutation.error.message
                  : 'Erro ao excluir'}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmDeletePergunta(null); deletePerguntaMutation.reset(); }}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deletePerguntaMutation.mutate(confirmDeletePergunta)}
                disabled={deletePerguntaMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deletePerguntaMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin inline" /> Excluindo...</>
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
