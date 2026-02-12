'use client';

import { useState } from 'react';
import { GripVertical, Pencil, Trash2, HelpCircle } from 'lucide-react';
import type { PerguntaResumo } from '@/lib/types/questionario';

interface PerguntaCardProps {
  pergunta: PerguntaResumo;
  index: number;
  canEdit: boolean;
  dragHandleProps?: Record<string, unknown>;
  onEdit: (seqPergunta: number) => void;
  onDelete: (seqPergunta: number) => void;
}

export function PerguntaCard({
  pergunta,
  index,
  canEdit,
  dragHandleProps,
  onEdit,
  onDelete,
}: PerguntaCardProps) {
  const [glossarioExpanded, setGlossarioExpanded] = useState(false);
  const p = pergunta;
  const hasGlossario = !!p.TXT_GLOSSARIO;

  return (
    <div className="hover:bg-gray-50 group">
      <div className="flex items-start gap-2 p-3">
        {/* Drag handle */}
        {canEdit && (
          <button
            className="flex-shrink-0 mt-1 p-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
            {...dragHandleProps}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        {/* Index */}
        <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
          {index}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {p.COD_PERGUNTA && (
              <span className="text-blue-600 font-mono mr-1.5">{p.COD_PERGUNTA}</span>
            )}
            {p.DSC_PERGUNTA}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">{p.DSC_TIPO_FORMATO_RESPOSTA}</span>
            <span className="text-xs text-gray-400">{p.QTD_RESPOSTAS} resp.</span>
            {hasGlossario && (
              <button
                onClick={() => setGlossarioExpanded(!glossarioExpanded)}
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
              >
                <HelpCircle className="w-3 h-3" />
                Ajuda
              </button>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span className={p.DSC_STATUS === 'RASCUNHO' ? 'badge-rascunho' : 'badge-publicado'}>
          {p.DSC_STATUS === 'RASCUNHO' ? 'Rascunho' : 'Publicado'}
        </span>

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(p.SEQ_PERGUNTA)}
              className="p-1 text-gray-400 hover:text-blue-600 rounded"
              title="Editar pergunta"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(p.SEQ_PERGUNTA)}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="Excluir pergunta"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Glossário expandido */}
      {hasGlossario && glossarioExpanded && (
        <div className="px-14 pb-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div
                className="glossario-html prose prose-sm prose-blue max-w-none"
                dangerouslySetInnerHTML={{ __html: p.TXT_GLOSSARIO! }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
