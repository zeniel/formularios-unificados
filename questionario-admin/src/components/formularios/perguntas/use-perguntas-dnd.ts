'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import type { CategoriaGrupo, ReordenarPerguntaItem } from '@/lib/types/questionario';

function parsePerguntaId(dndId: string): number {
  return parseInt(dndId.replace('pergunta-', ''), 10);
}

function parseCategoriaId(dndId: string): number | null {
  const val = dndId.replace('categoria-', '');
  return val === 'sem' ? null : parseInt(val, 10);
}

export function usePerguntasDnd(
  questionarioId: number,
  categorias: CategoriaGrupo[]
) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (ordens: ReordenarPerguntaItem[]) => {
      const res = await fetch(`/api/questionarios/${questionarioId}/perguntas/reordenar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordens }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao reordenar');
      }
    },
    onError: () => {
      // Rollback: invalidate to refetch from server
      queryClient.invalidateQueries({ queryKey: ['questionario', questionarioId] });
    },
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback is handled by isOver in droppable
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);

      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activePerguntaId = parsePerguntaId(String(active.id));

      // Find which category the active item is currently in
      let sourceCatIndex = -1;
      let sourceItemIndex = -1;
      for (let ci = 0; ci < categorias.length; ci++) {
        const idx = categorias[ci].perguntas.findIndex(
          (p) => p.SEQ_PERGUNTA === activePerguntaId
        );
        if (idx >= 0) {
          sourceCatIndex = ci;
          sourceItemIndex = idx;
          break;
        }
      }
      if (sourceCatIndex < 0) return;

      // Determine destination: over might be a pergunta or a categoria
      const overId = String(over.id);
      let destCatIndex: number;
      let destItemIndex: number;

      if (overId.startsWith('pergunta-')) {
        // Dropped on another pergunta
        const overPerguntaId = parsePerguntaId(overId);
        for (let ci = 0; ci < categorias.length; ci++) {
          const idx = categorias[ci].perguntas.findIndex(
            (p) => p.SEQ_PERGUNTA === overPerguntaId
          );
          if (idx >= 0) {
            destCatIndex = ci;
            destItemIndex = idx;
            break;
          }
        }
        if (destCatIndex! === undefined) return;
      } else if (overId.startsWith('categoria-')) {
        // Dropped on a category container (empty area)
        const catId = parseCategoriaId(overId);
        destCatIndex = categorias.findIndex(
          (c) => c.SEQ_CATEGORIA_PERGUNTA === catId
        );
        if (destCatIndex < 0) return;
        destItemIndex = categorias[destCatIndex].perguntas.length; // append to end
      } else {
        return;
      }

      // Build optimistic new categorias
      const newCategorias = categorias.map((c) => ({
        ...c,
        perguntas: [...c.perguntas],
      }));

      // Remove from source
      const [movedItem] = newCategorias[sourceCatIndex].perguntas.splice(sourceItemIndex, 1);

      // Update category
      const destCat = newCategorias[destCatIndex!];
      movedItem.SEQ_CATEGORIA_PERGUNTA = destCat.SEQ_CATEGORIA_PERGUNTA;
      movedItem.DSC_CATEGORIA_PERGUNTA = destCat.SEQ_CATEGORIA_PERGUNTA
        ? destCat.DSC_CATEGORIA_PERGUNTA
        : null;

      // Insert at destination
      const insertIdx =
        sourceCatIndex === destCatIndex! && sourceItemIndex < destItemIndex!
          ? destItemIndex! - 1
          : destItemIndex!;
      newCategorias[destCatIndex!].perguntas.splice(
        Math.max(0, Math.min(insertIdx, newCategorias[destCatIndex!].perguntas.length)),
        0,
        movedItem
      );

      // Build reorder payload: all perguntas with updated NUM_ORDEM and category
      const ordens: ReordenarPerguntaItem[] = [];
      for (const cat of newCategorias) {
        cat.perguntas.forEach((p, i) => {
          ordens.push({
            SEQ_PERGUNTA: p.SEQ_PERGUNTA,
            NUM_ORDEM: i + 1,
            SEQ_CATEGORIA_PERGUNTA: cat.SEQ_CATEGORIA_PERGUNTA,
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

      // Call API
      reorderMutation.mutate(ordens);
    },
    [categorias, questionarioId, queryClient, reorderMutation]
  );

  return {
    activeId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    isReordering: reorderMutation.isPending,
    reorderError: reorderMutation.error,
  };
}
