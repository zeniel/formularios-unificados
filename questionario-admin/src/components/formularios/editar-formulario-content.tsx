'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { FormularioForm } from './formulario-form';
import type { QuestionarioCompleto } from '@/lib/types/questionario';

interface EditarFormularioContentProps {
  id: number;
}

export function EditarFormularioContent({ id }: EditarFormularioContentProps) {
  const { data, isLoading, error } = useQuery<{ success: boolean; data: QuestionarioCompleto }>({
    queryKey: ['questionario', id],
    queryFn: async () => {
      const res = await fetch(`/api/questionarios/${id}`);
      if (!res.ok) throw new Error('Erro ao buscar questionário');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-500">Carregando...</span>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="space-y-4">
        <Link href="/formularios" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Link>
        <div className="flex items-center justify-center py-12 text-red-500">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Questionário não encontrado
        </div>
      </div>
    );
  }

  const questionario = data.data;

  if (questionario.DSC_STATUS !== 'RASCUNHO') {
    return (
      <div className="space-y-4">
        <Link href={`/formularios/${id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Link>
        <div className="flex items-center justify-center py-12 text-yellow-600">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Este formulário está publicado e não pode ser editado. Crie uma nova versão.
        </div>
      </div>
    );
  }

  return <FormularioForm questionario={questionario} />;
}
