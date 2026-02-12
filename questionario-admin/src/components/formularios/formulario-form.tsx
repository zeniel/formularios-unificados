'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import type { QuestionarioCompleto, CriarQuestionarioInput, EscopoResposta } from '@/lib/types/questionario';

interface FormularioFormProps {
  questionario?: QuestionarioCompleto;
}

interface LookupData {
  periodicidades: { SEQ_TIPO_PERIODICIDADE_PERGUNTA: number; DSC_TIPO_PERIODICIDADE_PERGUNTA: string }[];
  escopos: { SEQ_TIPO_ESCOPO_RESPOSTA: number; COD_TIPO_ESCOPO: string; DSC_TIPO_ESCOPO: string }[];
}

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export function FormularioForm({ questionario }: FormularioFormProps) {
  const router = useRouter();
  const isEditing = !!questionario;

  const [nome, setNome] = useState(questionario?.NOM_QUESTIONARIO ?? '');
  const [descricao, setDescricao] = useState(questionario?.DSC_QUESTIONARIO ?? '');
  const [periodicidade, setPeriodicidade] = useState<number>(
    0 // será populado quando lookups carregar
  );
  const [escopo, setEscopo] = useState<string>(questionario?.COD_ESCOPO_RESPOSTA ?? '');
  const [mesLimite, setMesLimite] = useState<number>(questionario?.NUM_MES_LIMITE ?? 1);
  const [diaLimite, setDiaLimite] = useState<string>(
    questionario?.NUM_DIA_LIMITE?.toString() ?? ''
  );
  const [observacao, setObservacao] = useState(questionario?.DSC_OBSERVACAO_QUESTIONARIO ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { data: lookupData, isLoading: loadingLookups } = useQuery<{ success: boolean; data: LookupData }>({
    queryKey: ['questionarios-lookup'],
    queryFn: async () => {
      const res = await fetch('/api/questionarios/lookup');
      if (!res.ok) throw new Error('Erro ao carregar dados de referência');
      return res.json();
    },
  });

  // Setar periodicidade default quando lookups carregam
  useEffect(() => {
    if (lookupData?.data?.periodicidades && periodicidade === 0) {
      if (isEditing && questionario) {
        // Encontrar a periodicidade pelo nome
        const found = lookupData.data.periodicidades.find(
          p => p.DSC_TIPO_PERIODICIDADE_PERGUNTA === questionario.DSC_TIPO_PERIODICIDADE
        );
        if (found) setPeriodicidade(found.SEQ_TIPO_PERIODICIDADE_PERGUNTA);
      } else if (lookupData.data.periodicidades.length > 0) {
        setPeriodicidade(lookupData.data.periodicidades[0].SEQ_TIPO_PERIODICIDADE_PERGUNTA);
      }
    }
  }, [lookupData, periodicidade, isEditing, questionario]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro('O nome do formulário é obrigatório');
      return;
    }
    if (!descricao.trim()) {
      setErro('A descrição é obrigatória');
      return;
    }
    if (!periodicidade) {
      setErro('Selecione uma periodicidade');
      return;
    }

    setSubmitting(true);

    try {
      if (isEditing) {
        const res = await fetch(`/api/questionarios/${questionario.SEQ_QUESTIONARIO}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            NOM_QUESTIONARIO: nome.trim(),
            DSC_QUESTIONARIO: descricao.trim(),
            NUM_MES_LIMITE: mesLimite,
            NUM_DIA_LIMITE: diaLimite ? parseInt(diaLimite, 10) : null,
            DSC_OBSERVACAO_QUESTIONARIO: observacao.trim() || null,
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Erro ao salvar');
        }

        router.push(`/formularios/${questionario.SEQ_QUESTIONARIO}`);
      } else {
        const body: CriarQuestionarioInput = {
          NOM_QUESTIONARIO: nome.trim(),
          DSC_QUESTIONARIO: descricao.trim(),
          SEQ_TIPO_PERIODICIDADE_PERGUNTA: periodicidade,
          NUM_MES_LIMITE: mesLimite,
          NUM_DIA_LIMITE: diaLimite ? parseInt(diaLimite, 10) : undefined,
          DSC_OBSERVACAO_QUESTIONARIO: observacao.trim() || undefined,
          COD_ESCOPO_RESPOSTA: escopo as EscopoResposta || undefined,
        };

        const res = await fetch('/api/questionarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Erro ao criar');
        }

        const json = await res.json();
        router.push(`/formularios/${json.data.SEQ_QUESTIONARIO}`);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingLookups) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-500">Carregando...</span>
      </div>
    );
  }

  const lookups = lookupData?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={isEditing ? `/formularios/${questionario.SEQ_QUESTIONARIO}` : '/formularios'}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Formulário' : 'Novo Formulário'}
          </h2>
          {isEditing && (
            <p className="text-gray-500 mt-1">
              {questionario.NOM_QUESTIONARIO} - v{questionario.NUM_VERSAO}
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6 max-w-3xl">
        {/* Nome */}
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Formulário *
          </label>
          <input
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={150}
            className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nome do formulário"
          />
        </div>

        {/* Descrição */}
        <div>
          <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
            Descrição *
          </label>
          <textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Descreva o objetivo do formulário"
          />
        </div>

        {/* Periodicidade + Escopo (lado a lado) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="periodicidade" className="block text-sm font-medium text-gray-700 mb-1">
              Periodicidade *
            </label>
            <select
              id="periodicidade"
              value={periodicidade}
              onChange={(e) => setPeriodicidade(parseInt(e.target.value, 10))}
              disabled={isEditing}
              className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            >
              {lookups?.periodicidades.map(p => (
                <option key={p.SEQ_TIPO_PERIODICIDADE_PERGUNTA} value={p.SEQ_TIPO_PERIODICIDADE_PERGUNTA}>
                  {p.DSC_TIPO_PERIODICIDADE_PERGUNTA}
                </option>
              ))}
            </select>
            {isEditing && (
              <p className="text-xs text-gray-400 mt-1">Não pode ser alterada após criação</p>
            )}
          </div>

          <div>
            <label htmlFor="escopo" className="block text-sm font-medium text-gray-700 mb-1">
              Escopo de Resposta
            </label>
            <select
              id="escopo"
              value={escopo}
              onChange={(e) => setEscopo(e.target.value)}
              disabled={isEditing}
              className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">Selecione...</option>
              {lookups?.escopos.map(e => (
                <option key={e.SEQ_TIPO_ESCOPO_RESPOSTA} value={e.COD_TIPO_ESCOPO}>
                  {e.DSC_TIPO_ESCOPO}
                </option>
              ))}
            </select>
            {isEditing && (
              <p className="text-xs text-gray-400 mt-1">Não pode ser alterado após criação</p>
            )}
          </div>
        </div>

        {/* Mês Limite + Dia Limite */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="mesLimite" className="block text-sm font-medium text-gray-700 mb-1">
              Mês Limite *
            </label>
            <select
              id="mesLimite"
              value={mesLimite}
              onChange={(e) => setMesLimite(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MESES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="diaLimite" className="block text-sm font-medium text-gray-700 mb-1">
              Dia Limite
            </label>
            <input
              id="diaLimite"
              type="number"
              min={1}
              max={31}
              value={diaLimite}
              onChange={(e) => setDiaLimite(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Opcional"
            />
          </div>
        </div>

        {/* Observação */}
        <div>
          <label htmlFor="observacao" className="block text-sm font-medium text-gray-700 mb-1">
            Observação
          </label>
          <textarea
            id="observacao"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Observações adicionais (opcional)"
          />
        </div>

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {erro}
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={isEditing ? `/formularios/${questionario.SEQ_QUESTIONARIO}` : '/formularios'}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? 'Salvar Alterações' : 'Criar Formulário'}
          </button>
        </div>
      </form>
    </div>
  );
}
