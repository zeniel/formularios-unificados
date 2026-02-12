'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Save, HelpCircle, Plus, X } from 'lucide-react';
import Link from 'next/link';
import type { QuestionarioCompleto, CriarQuestionarioInput, EscopoResposta } from '@/lib/types/questionario';
import { TribunalSelectorModal } from './escopo/tribunal-selector-modal';
import { OrgaoSelector } from './escopo/orgao-selector';

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

// Ajuda contextual para periodicidades
const AJUDA_PERIODICIDADE: Record<number, { descricao: string; mesesInfo: string | null }> = {
  1: {
    descricao: 'Os dados devem ser enviados todo mês, referentes ao mês anterior.',
    mesesInfo: 'O prazo é sempre no mês seguinte ao período de referência.',
  },
  2: {
    descricao: 'Os dados devem ser enviados a cada semestre.',
    mesesInfo: 'Períodos: jan-jun e jul-dez. Prazo no 1\u00BA mês do semestre seguinte (janeiro ou julho).',
  },
  3: {
    descricao: 'Os dados devem ser enviados uma vez por ano, referentes ao ano anterior.',
    mesesInfo: null, // Mês limite é configurável
  },
  4: {
    descricao: 'Os dados devem ser enviados a cada trimestre.',
    mesesInfo: 'Períodos: jan-mar, abr-jun, jul-set, out-dez. Prazo no 1\u00BA mês do trimestre seguinte (janeiro, abril, julho ou outubro).',
  },
};

// Ajuda para escopos de resposta
const AJUDA_ESCOPO: Record<string, string> = {
  TRIBUNAL: 'Cada tribunal envia uma única resposta consolidada para todo o tribunal.',
  ORGAO: 'Cada órgão (unidade judiciária) do tribunal envia sua própria resposta individualmente.',
  INDIVIDUAL: 'Cada usuário responde de forma individual, independente do órgão ou tribunal.',
};

// Periodicidade 3 (Anual) é a única que precisa do campo "Mês Limite"
function precisaMesLimite(cod: number): boolean {
  return cod === 3;
}

// Mini-componente: lista de tribunais selecionados com nomes resolvidos
function TribunaisResumo({ ids, onRemove }: { ids: number[]; onRemove: (id: number) => void }) {
  const { data } = useQuery<{ success: boolean; data: { seqOrgao: number; nome: string; sigla: string }[] }>({
    queryKey: ['corporativo-tribunais'],
    queryFn: async () => {
      const res = await fetch('/api/corporativo/tribunais');
      if (!res.ok) throw new Error('Erro');
      return res.json();
    },
  });

  const tribunais = data?.data ?? [];
  const mapa = new Map(tribunais.map(t => [t.seqOrgao, t]));

  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map(id => {
        const t = mapa.get(id);
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
          >
            {t ? `${t.sigla} - ${t.nome}` : `#${id}`}
            <button type="button" onClick={() => onRemove(id)} className="hover:text-red-600">
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}

export function FormularioForm({ questionario }: FormularioFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [dataAtivacao, setDataAtivacao] = useState<string>(
    questionario?.DAT_ATIVACAO_FORMULARIO
      ? new Date(questionario.DAT_ATIVACAO_FORMULARIO).toISOString().split('T')[0]
      : ''
  );
  const [dataInativacao, setDataInativacao] = useState<string>(
    questionario?.DAT_INATIVACAO_FORMULARIO
      ? new Date(questionario.DAT_INATIVACAO_FORMULARIO).toISOString().split('T')[0]
      : ''
  );

  // Estado do escopo — tribunais selecionados (escopo TRIBUNAL)
  const [escopoTribunais, setEscopoTribunais] = useState<number[]>(
    questionario?.escopoOrgaos ?? []
  );
  const [modalTribunaisAberto, setModalTribunaisAberto] = useState(false);

  // Estado do escopo — tribunal de referência + órgãos (escopo ORGAO)
  const [tribunalRef, setTribunalRef] = useState<{ seqOrgao: number; nome: string; sigla: string; esfera?: string } | null>(null);
  const [escopoOrgaos, setEscopoOrgaos] = useState<{ seqOrgao: number; dscOrgao: string }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Sob demanda = sem periodicidade (FK null)
  // Determinado pelo query param na criação, ou pela ausência de periodicidade na edição
  const isSobDemanda = isEditing
    ? questionario.SEQ_TIPO_PERIODICIDADE_PERGUNTA === null
    : searchParams.get('tipo') === 'sob-demanda';

  const { data: lookupData, isLoading: loadingLookups } = useQuery<{ success: boolean; data: LookupData }>({
    queryKey: ['questionarios-lookup'],
    queryFn: async () => {
      const res = await fetch('/api/questionarios/lookup');
      if (!res.ok) throw new Error('Erro ao carregar dados de referência');
      return res.json();
    },
  });

  // Setar periodicidade default quando lookups carregam (apenas para periódicos)
  useEffect(() => {
    if (isSobDemanda) return; // Sob demanda não usa periodicidade
    if (lookupData?.data?.periodicidades && periodicidade === 0) {
      if (isEditing && questionario) {
        const found = lookupData.data.periodicidades.find(
          p => p.DSC_TIPO_PERIODICIDADE_PERGUNTA === questionario.DSC_TIPO_PERIODICIDADE
        );
        if (found) setPeriodicidade(found.SEQ_TIPO_PERIODICIDADE_PERGUNTA);
      } else if (lookupData.data.periodicidades.length > 0) {
        setPeriodicidade(lookupData.data.periodicidades[0].SEQ_TIPO_PERIODICIDADE_PERGUNTA);
      }
    }
  }, [lookupData, periodicidade, isEditing, questionario, isSobDemanda]);

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
    if (!isSobDemanda && !periodicidade) {
      setErro('Selecione uma periodicidade');
      return;
    }

    if (isSobDemanda && !dataAtivacao) {
      setErro('A data de ativação é obrigatória para formulários Sob Demanda');
      return;
    }
    if (isSobDemanda && dataInativacao && dataAtivacao && dataInativacao <= dataAtivacao) {
      setErro('A data de inativação deve ser posterior à data de ativação');
      return;
    }

    setSubmitting(true);

    try {
      const mesLimiteEfetivo = isSobDemanda ? null : (precisaMesLimite(periodicidade) ? mesLimite : null);

      if (isEditing) {
        const res = await fetch(`/api/questionarios/${questionario.SEQ_QUESTIONARIO}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            NOM_QUESTIONARIO: nome.trim(),
            DSC_QUESTIONARIO: descricao.trim(),
            NUM_MES_LIMITE: mesLimiteEfetivo,
            NUM_DIA_LIMITE: isSobDemanda ? null : (diaLimite ? parseInt(diaLimite, 10) : null),
            DSC_OBSERVACAO_QUESTIONARIO: observacao.trim() || null,
            DAT_ATIVACAO_FORMULARIO: isSobDemanda && dataAtivacao ? dataAtivacao : null,
            DAT_INATIVACAO_FORMULARIO: isSobDemanda && dataInativacao ? dataInativacao : null,
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Erro ao salvar');
        }

        router.push(`/formularios/${questionario.SEQ_QUESTIONARIO}`);
      } else {
        // Montar IDs de escopo conforme o tipo
        let escopoIds: number[] | undefined;
        let seqOrgaoEscopo: number | undefined;
        if (escopo === 'TRIBUNAL' && escopoTribunais.length > 0) {
          escopoIds = escopoTribunais;
        } else if (escopo === 'ORGAO') {
          seqOrgaoEscopo = tribunalRef?.seqOrgao;
          if (escopoOrgaos.length > 0) {
            escopoIds = escopoOrgaos.map(o => o.seqOrgao);
          }
        }

        const body: CriarQuestionarioInput = {
          NOM_QUESTIONARIO: nome.trim(),
          DSC_QUESTIONARIO: descricao.trim(),
          SEQ_TIPO_PERIODICIDADE_PERGUNTA: isSobDemanda ? null : periodicidade,
          NUM_MES_LIMITE: mesLimiteEfetivo,
          NUM_DIA_LIMITE: isSobDemanda ? undefined : (diaLimite ? parseInt(diaLimite, 10) : undefined),
          DSC_OBSERVACAO_QUESTIONARIO: observacao.trim() || undefined,
          COD_ESCOPO_RESPOSTA: escopo as EscopoResposta || undefined,
          SEQ_ORGAO_ESCOPO: seqOrgaoEscopo,
          escopoOrgaos: escopoIds,
          DAT_ATIVACAO_FORMULARIO: isSobDemanda && dataAtivacao ? dataAtivacao : undefined,
          DAT_INATIVACAO_FORMULARIO: isSobDemanda && dataInativacao ? dataInativacao : undefined,
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
          href={isEditing
            ? `/formularios/${questionario.SEQ_QUESTIONARIO}`
            : (isSobDemanda ? '/formularios/sob-demanda' : '/formularios/periodicos')
          }
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing
              ? 'Editar Formulário'
              : isSobDemanda
                ? 'Novo Formulário Sob Demanda'
                : 'Novo Formulário Periódico'
            }
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
          {isSobDemanda ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <input
                type="text"
                value="Sob Demanda"
                disabled
                className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-100 text-gray-500"
              />
            </div>
          ) : (
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
              {isEditing ? (
                <p className="text-xs text-gray-400 mt-1">Não pode ser alterada após criação</p>
              ) : AJUDA_PERIODICIDADE[periodicidade] && (
                <p className="text-xs text-gray-500 mt-1">
                  {AJUDA_PERIODICIDADE[periodicidade].descricao}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="escopo" className="block text-sm font-medium text-gray-700 mb-1">
              Escopo de Resposta
              {escopo && AJUDA_ESCOPO[escopo] && (
                <span title={AJUDA_ESCOPO[escopo]} className="ml-1 inline-block align-middle">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help inline" />
                </span>
              )}
            </label>
            <select
              id="escopo"
              value={escopo}
              onChange={(e) => {
                setEscopo(e.target.value);
                // Limpar seleções ao trocar escopo
                setEscopoTribunais([]);
                setTribunalRef(null);
                setEscopoOrgaos([]);
              }}
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
            {isEditing ? (
              <p className="text-xs text-gray-400 mt-1">Não pode ser alterado após criação</p>
            ) : escopo && AJUDA_ESCOPO[escopo] && (
              <p className="text-xs text-gray-500 mt-1">
                {AJUDA_ESCOPO[escopo]}
              </p>
            )}
          </div>
        </div>

        {/* Escopo — seleção de tribunais (condicional ao escopo TRIBUNAL) */}
        {escopo === 'TRIBUNAL' && !isEditing && (
          <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Tribunais Participantes
              </label>
              <button
                type="button"
                onClick={() => setModalTribunaisAberto(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Selecionar Tribunais
              </button>
            </div>
            {escopoTribunais.length > 0 ? (
              <TribunaisResumo
                ids={escopoTribunais}
                onRemove={(id) => setEscopoTribunais(prev => prev.filter(t => t !== id))}
              />
            ) : (
              <p className="text-xs text-gray-400">
                Nenhum tribunal selecionado. O formulário ficará disponível para todos os tribunais.
              </p>
            )}

            {modalTribunaisAberto && (
              <TribunalSelectorModal
                selectedIds={escopoTribunais}
                onConfirm={(ids) => {
                  setEscopoTribunais(ids);
                  setModalTribunaisAberto(false);
                }}
                onClose={() => setModalTribunaisAberto(false)}
              />
            )}
          </div>
        )}

        {/* Escopo — seleção de órgãos (condicional ao escopo ORGAO) */}
        {escopo === 'ORGAO' && !isEditing && (
          <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-4">
            <OrgaoSelector
              tribunalSelecionado={tribunalRef}
              onTribunalChange={(t) => {
                setTribunalRef(t);
                if (!t || t.seqOrgao !== tribunalRef?.seqOrgao) {
                  setEscopoOrgaos([]);
                }
              }}
              orgaosSelecionados={escopoOrgaos}
              onOrgaosChange={setEscopoOrgaos}
            />
          </div>
        )}

        {/* Prazo — dinâmico por periodicidade (apenas para periódicos) */}
        {!isSobDemanda && periodicidade > 0 && (
          <>
            {/* Info de meses fixos (quando o mês limite não é configurável) */}
            {!precisaMesLimite(periodicidade) && AJUDA_PERIODICIDADE[periodicidade]?.mesesInfo && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                {AJUDA_PERIODICIDADE[periodicidade].mesesInfo}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mês Limite — apenas para Anual */}
              {precisaMesLimite(periodicidade) && (
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
                  <p className="text-xs text-gray-500 mt-1">
                    Mês do ano seguinte até o qual os dados podem ser enviados
                  </p>
                </div>
              )}

              {/* Dia Limite — sempre visível para periódicos */}
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
                  placeholder="Último dia do mês"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se não informado, o prazo vai até o último dia do mês
                </p>
              </div>
            </div>
          </>
        )}

        {/* Datas de Ativação/Inativação (apenas para Sob Demanda) */}
        {isSobDemanda && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dataAtivacao" className="block text-sm font-medium text-gray-700 mb-1">
                Data de Ativação *
              </label>
              <input
                id="dataAtivacao"
                type="date"
                value={dataAtivacao}
                onChange={(e) => setDataAtivacao(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="dataInativacao" className="block text-sm font-medium text-gray-700 mb-1">
                Data de Inativação
              </label>
              <input
                id="dataInativacao"
                type="date"
                value={dataInativacao}
                onChange={(e) => setDataInativacao(e.target.value)}
                min={dataAtivacao || undefined}
                className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Opcional - se não informada, o formulário permanece ativo indefinidamente</p>
            </div>
          </div>
        )}

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
            href={isEditing
              ? `/formularios/${questionario.SEQ_QUESTIONARIO}`
              : (isSobDemanda ? '/formularios/sob-demanda' : '/formularios/periodicos')
            }
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
