'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PerguntaResumo } from '@/lib/types/questionario';
import { PerguntaCard } from './pergunta-card';

interface SortablePerguntaProps {
  pergunta: PerguntaResumo;
  index: number;
  canEdit: boolean;
  onEdit: (seqPergunta: number) => void;
  onDelete: (seqPergunta: number) => void;
}

export function SortablePergunta({
  pergunta,
  index,
  canEdit,
  onEdit,
  onDelete,
}: SortablePerguntaProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `pergunta-${pergunta.SEQ_PERGUNTA}`,
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <PerguntaCard
        pergunta={pergunta}
        index={index}
        canEdit={canEdit}
        dragHandleProps={listeners}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
