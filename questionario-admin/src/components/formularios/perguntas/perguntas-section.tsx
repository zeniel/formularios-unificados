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
import type { CategoriaGrupo, ReordenarPerguntaItem } from '@/lib/types/questionario';
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

  // Sort mutation (reuses the same reorder API)
  const sortMutation = useMutation({
    mutationFn: async (ordens: ReordenarPerguntaItem[]) => {
      const res = await fetch(`/api/questionarios/${questionarioId}/perguntas/reordenar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordens }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao ordenar');
      }
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['questionario', questionarioId] });
    },
  });

  // Reorder categories mutation
  const reorderCategoriasMutation = useMutation({
    mutationFn: async (ordens: { SEQ_CATEGORIA_PERGUNTA: number; NUM_ORDEM: number }[]) => {
      const res = await fetch('/api/categorias/reordenar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordens }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao reordenar categorias');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionario', questionarioId] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['questionario', questionarioId] });
    },
  });

  function handleMoveCategoria(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categorias.length) return;

    // Só move categorias reais (com ID), "Sem categoria" não participa
    const cat = categorias[index];
    const target = categorias[targetIndex];
    if (cat.SEQ_CATEGORIA_PERGUNTA === null || target.SEQ_CATEGORIA_PERGUNTA === null) return;

    // Swap ordens
    const newCategorias = [...categorias];
    newCategorias[index] = target;
    newCategorias[targetIndex] = cat;

    // Optimistic update
    queryClient.setQueryData(
      ['questionario', questionarioId],
      (old: { success: boolean; data: Record<string, unknown> } | undefined) => {
        if (!old) return old;
        return { ...old, data: { ...old.data, categorias: newCategorias } };
      }
    );

    // Persistir: usar posição no array como NUM_ORDEM
    const ordens = newCategorias
      .filter(c => c.SEQ_CATEGORIA_PERGUNTA !== null)
      .map((c, i) => ({
        SEQ_CATEGORIA_PERGUNTA: c.SEQ_CATEGORIA_PERGUNTA!,
        NUM_ORDEM: i + 1,
      }));

    reorderCategoriasMutation.mutate(ordens);
  }

  function handleSortCategoria(seqCategoria: number | null) {
    const catIndex = categorias.findIndex((c) => c.SEQ_CATEGORIA_PERGUNTA === seqCategoria);
    if (catIndex < 0) return;

    const cat = categorias[catIndex];
    if (cat.perguntas.length <= 1) return;

    // Ordenação natural: trata segmentos numéricos como números
    // Ex: "1.2" < "1.10" (compara 2 vs 10 numericamente)
    const naturalCompare = (a: string, b: string): number => {
      const partsA = a.split('.');
      const partsB = b.split('.');
      const len = Math.max(partsA.length, partsB.length);
      for (let i = 0; i < len; i++) {
        const pa = partsA[i] ?? '';
        const pb = partsB[i] ?? '';
        const na = Number(pa);
        const nb = Number(pb);
        if (!isNaN(na) && !isNaN(nb)) {
          if (na !== nb) return na - nb;
        } else {
          const cmp = pa.localeCompare(pb);
          if (cmp !== 0) return cmp;
        }
      }
      return 0;
    };

    // Sort perguntas: COD_PERGUNTA ascending natural (nulls last), then DSC_PERGUNTA ascending
    const sortedPerguntas = [...cat.perguntas].sort((a, b) => {
      if (a.COD_PERGUNTA && b.COD_PERGUNTA) {
        const cmp = naturalCompare(a.COD_PERGUNTA, b.COD_PERGUNTA);
        if (cmp !== 0) return cmp;
      }
      if (a.COD_PERGUNTA && !b.COD_PERGUNTA) return -1;
      if (!a.COD_PERGUNTA && b.COD_PERGUNTA) return 1;
      return (a.DSC_PERGUNTA || '').localeCompare(b.DSC_PERGUNTA || '');
    });

    // Build new categorias with sorted category
    const newCategorias = categorias.map((c, i) =>
      i === catIndex ? { ...c, perguntas: sortedPerguntas } : c
    );

    // Build reorder payload for ALL perguntas (all categories)
    const ordens: ReordenarPerguntaItem[] = [];
    for (const c of newCategorias) {
      c.perguntas.forEach((p, i) => {
        ordens.push({
          SEQ_PERGUNTA: p.SEQ_PERGUNTA,
          NUM_ORDEM: i + 1,
          SEQ_CATEGORIA_PERGUNTA: c.SEQ_CATEGORIA_PERGUNTA,
        });
      });
    }

    // Optimistic update
    queryClient.setQueryData(
      ['questionario', questionarioId],
      (old: { success: boolean; data: Record<string, unknown> } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            categorias: newCategorias,
          },
        };
      }
    );

    sortMutation.mutate(ordens);
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
              {categorias.map((cat, catIdx) => {
                const startIdx = globalIndex + 1;
                globalIndex += cat.perguntas.length;
                const isRealCategory = cat.SEQ_CATEGORIA_PERGUNTA !== null;
                return (
                  <CategoriaDroppable
                    key={cat.SEQ_CATEGORIA_PERGUNTA ?? 'sem-categoria'}
                    categoria={cat}
                    canEdit={showControls}
                    globalIndexStart={startIdx}
                    onRename={(catId, nome) => renameCategoriaMutation.mutate({ catId, nome })}
                    onEditPergunta={handleEditPergunta}
                    onDeletePergunta={handleDeletePergunta}
                    onSortCategoria={handleSortCategoria}
                    onMoveUp={isRealCategory ? () => handleMoveCategoria(catIdx, 'up') : undefined}
                    onMoveDown={isRealCategory ? () => handleMoveCategoria(catIdx, 'down') : undefined}
                    isFirst={catIdx === 0}
                    isLast={catIdx === categorias.length - 1}
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
      {(renameCategoriaMutation.error || reorderError || sortMutation.error || reorderCategoriasMutation.error) && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg shadow-lg z-50">
          {renameCategoriaMutation.error instanceof Error
            ? renameCategoriaMutation.error.message
            : reorderError instanceof Error
            ? reorderError.message
            : sortMutation.error instanceof Error
            ? sortMutation.error.message
            : reorderCategoriasMutation.error instanceof Error
            ? reorderCategoriasMutation.error.message
            : 'Erro'}
        </div>
      )}

      {/* Pergunta form modal */}
      <PerguntaFormModal
        questionarioId={questionarioId}
        perguntaId={editingPerguntaId}
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
