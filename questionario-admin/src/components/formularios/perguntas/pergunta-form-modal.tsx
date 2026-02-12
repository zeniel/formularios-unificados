'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, FileText, Plus, X } from 'lucide-react';
import type {
  PerguntaCompleta,
  FormatoResposta,
  VariavelPergunta,
  CategoriaGrupo,
} from '@/lib/types/questionario';
import type { Periodicidade } from '@/lib/questionarios/repository';
import { PerguntaTemplateSearch } from './pergunta-template-search';
import type { PerguntaResumo } from '@/lib/types/questionario';

interface PerguntaFormModalProps {
  questionarioId: number;
  perguntaId?: number | null; // null = criar, number = editar
  categorias: CategoriaGrupo[];
  open: boolean;
  onClose: () => void;
}

interface FormData {
  DSC_PERGUNTA: string;
  COD_PERGUNTA: string;
  DSC_COMPLEMENTO_PERGUNTA: string;
  TXT_GLOSSARIO: string;
  SEQ_TIPO_FORMATO_RESPOSTA: string;
  SEQ_TIPO_VARIAVEL_PERGUNTA: string;
  SEQ_TIPO_PERIODICIDADE_PERGUNTA: string;
  SEQ_CATEGORIA_PERGUNTA: string;
  opcoes: string[];
}

const EMPTY_FORM: FormData = {
  DSC_PERGUNTA: '',
  COD_PERGUNTA: '',
  DSC_COMPLEMENTO_PERGUNTA: '',
  TXT_GLOSSARIO: '',
  SEQ_TIPO_FORMATO_RESPOSTA: '',
  SEQ_TIPO_VARIAVEL_PERGUNTA: '',
  SEQ_TIPO_PERIODICIDADE_PERGUNTA: '',
  SEQ_CATEGORIA_PERGUNTA: '',
  opcoes: [],
};

// Formatos que usam opções (multi-resposta, lista para escolha única)
const FORMATOS_COM_OPCOES = [7, 11];

export function PerguntaFormModal({
  questionarioId,
  perguntaId,
  categorias,
  open,
  onClose,
}: PerguntaFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!perguntaId;
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [showTemplateSearch, setShowTemplateSearch] = useState(false);

  // Lookups
  const { data: lookups } = useQuery<{
    success: boolean;
    data: {
      formatos: FormatoResposta[];
      variaveis: VariavelPergunta[];
      periodicidades: Periodicidade[];
    };
  }>({
    queryKey: ['perguntas-lookup'],
    queryFn: async () => {
      const res = await fetch('/api/perguntas/lookup');
      if (!res.ok) throw new Error('Erro ao buscar lookups');
      return res.json();
    },
    enabled: open,
  });

  // Dados da pergunta para edição
  const { data: perguntaData, isLoading: loadingPergunta } = useQuery<{
    success: boolean;
    data: PerguntaCompleta;
  }>({
    queryKey: ['pergunta', questionarioId, perguntaId],
    queryFn: async () => {
      const res = await fetch(`/api/questionarios/${questionarioId}/perguntas/${perguntaId}`);
      if (!res.ok) throw new Error('Erro ao buscar pergunta');
      return res.json();
    },
    enabled: open && isEditing,
  });

  // Preencher form com dados da pergunta para edição
  useEffect(() => {
    if (perguntaData?.data) {
      const p = perguntaData.data;
      setForm({
        DSC_PERGUNTA: p.DSC_PERGUNTA,
        COD_PERGUNTA: p.COD_PERGUNTA || '',
        DSC_COMPLEMENTO_PERGUNTA: p.DSC_COMPLEMENTO_PERGUNTA || '',
        TXT_GLOSSARIO: p.TXT_GLOSSARIO || '',
        SEQ_TIPO_FORMATO_RESPOSTA: String(p.SEQ_TIPO_FORMATO_RESPOSTA),
        SEQ_TIPO_VARIAVEL_PERGUNTA: String(p.SEQ_TIPO_VARIAVEL_PERGUNTA),
        SEQ_TIPO_PERIODICIDADE_PERGUNTA: String(p.SEQ_TIPO_PERIODICIDADE_PERGUNTA),
        SEQ_CATEGORIA_PERGUNTA: p.SEQ_CATEGORIA_PERGUNTA ? String(p.SEQ_CATEGORIA_PERGUNTA) : '',
        opcoes: p.opcoes || [],
      });
    }
  }, [perguntaData]);

  // Resetar form ao abrir para criar
  useEffect(() => {
    if (open && !isEditing) {
      setForm(EMPTY_FORM);
      setShowTemplateSearch(false);
    }
  }, [open, isEditing]);

  const formatoSelecionado = lookups?.data.formatos.find(
    (f) => String(f.SEQ_TIPO_FORMATO_RESPOSTA) === form.SEQ_TIPO_FORMATO_RESPOSTA
  );
  const mostrarOpcoes = formatoSelecionado
    ? FORMATOS_COM_OPCOES.includes(formatoSelecionado.COD_TIPO_FORMATO_RESPOSTA)
    : false;

  // Mutation para criar/editar
  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        DSC_PERGUNTA: form.DSC_PERGUNTA,
        COD_PERGUNTA: form.COD_PERGUNTA || null,
        DSC_COMPLEMENTO_PERGUNTA: form.DSC_COMPLEMENTO_PERGUNTA || null,
        TXT_GLOSSARIO: form.TXT_GLOSSARIO || null,
        SEQ_TIPO_FORMATO_RESPOSTA: parseInt(form.SEQ_TIPO_FORMATO_RESPOSTA, 10),
        SEQ_TIPO_VARIAVEL_PERGUNTA: parseInt(form.SEQ_TIPO_VARIAVEL_PERGUNTA, 10),
        SEQ_TIPO_PERIODICIDADE_PERGUNTA: parseInt(form.SEQ_TIPO_PERIODICIDADE_PERGUNTA, 10),
        SEQ_CATEGORIA_PERGUNTA: form.SEQ_CATEGORIA_PERGUNTA ? parseInt(form.SEQ_CATEGORIA_PERGUNTA, 10) : null,
        opcoes: mostrarOpcoes ? form.opcoes.filter(Boolean) : [],
      };

      const url = isEditing
        ? `/api/questionarios/${questionarioId}/perguntas/${perguntaId}`
        : `/api/questionarios/${questionarioId}/perguntas`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao salvar pergunta');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionario', questionarioId] });
      setForm(EMPTY_FORM);
      onClose();
    },
  });

  function handleTemplateSelect(p: PerguntaResumo) {
    // Preencher form com dados da pergunta template (buscar completa)
    fetch(`/api/questionarios/${questionarioId}/perguntas/${p.SEQ_PERGUNTA}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          const t = json.data as PerguntaCompleta;
          setForm({
            DSC_PERGUNTA: t.DSC_PERGUNTA,
            COD_PERGUNTA: '', // Código deve ser novo
            DSC_COMPLEMENTO_PERGUNTA: t.DSC_COMPLEMENTO_PERGUNTA || '',
            TXT_GLOSSARIO: t.TXT_GLOSSARIO || '',
            SEQ_TIPO_FORMATO_RESPOSTA: String(t.SEQ_TIPO_FORMATO_RESPOSTA),
            SEQ_TIPO_VARIAVEL_PERGUNTA: String(t.SEQ_TIPO_VARIAVEL_PERGUNTA),
            SEQ_TIPO_PERIODICIDADE_PERGUNTA: String(t.SEQ_TIPO_PERIODICIDADE_PERGUNTA),
            SEQ_CATEGORIA_PERGUNTA: t.SEQ_CATEGORIA_PERGUNTA ? String(t.SEQ_CATEGORIA_PERGUNTA) : '',
            opcoes: t.opcoes || [],
          });
        }
      })
      .catch(() => {
        // Fallback: usar dados básicos do resumo
        setForm((prev) => ({
          ...prev,
          DSC_PERGUNTA: p.DSC_PERGUNTA,
          COD_PERGUNTA: '',
        }));
      });
    setShowTemplateSearch(false);
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addOpcao() {
    setForm((prev) => ({ ...prev, opcoes: [...prev.opcoes, ''] }));
  }

  function updateOpcao(index: number, value: string) {
    setForm((prev) => {
      const opcoes = [...prev.opcoes];
      opcoes[index] = value;
      return { ...prev, opcoes };
    });
  }

  function removeOpcao(index: number) {
    setForm((prev) => ({
      ...prev,
      opcoes: prev.opcoes.filter((_, i) => i !== index),
    }));
  }

  const canSubmit =
    form.DSC_PERGUNTA.trim() &&
    form.SEQ_TIPO_FORMATO_RESPOSTA &&
    form.SEQ_TIPO_VARIAVEL_PERGUNTA &&
    form.SEQ_TIPO_PERIODICIDADE_PERGUNTA;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold">
              {isEditing ? 'Editar Pergunta' : 'Nova Pergunta'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Loading para edição */}
          {isEditing && loadingPergunta && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="ml-2 text-gray-500">Carregando...</span>
            </div>
          )}

          {/* Template search para criação */}
          {!isEditing && (
            <div>
              {!showTemplateSearch ? (
                <button
                  type="button"
                  onClick={() => setShowTemplateSearch(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Usar pergunta existente como modelo
                </button>
              ) : (
                <PerguntaTemplateSearch onSelect={handleTemplateSelect} />
              )}
            </div>
          )}

          {/* Campos do formulário */}
          {(!isEditing || !loadingPergunta) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Texto da pergunta *
                </label>
                <textarea
                  value={form.DSC_PERGUNTA}
                  onChange={(e) => updateField('DSC_PERGUNTA', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Digite o texto da pergunta..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    value={form.COD_PERGUNTA}
                    onChange={(e) => updateField('COD_PERGUNTA', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ex: Q1_P01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={form.SEQ_CATEGORIA_PERGUNTA}
                    onChange={(e) => updateField('SEQ_CATEGORIA_PERGUNTA', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Sem categoria</option>
                    {categorias
                      .filter((c) => c.SEQ_CATEGORIA_PERGUNTA !== null)
                      .map((c) => (
                        <option key={c.SEQ_CATEGORIA_PERGUNTA} value={String(c.SEQ_CATEGORIA_PERGUNTA)}>
                          {c.DSC_CATEGORIA_PERGUNTA}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formato de resposta *
                  </label>
                  <select
                    value={form.SEQ_TIPO_FORMATO_RESPOSTA}
                    onChange={(e) => updateField('SEQ_TIPO_FORMATO_RESPOSTA', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {lookups?.data.formatos.map((f) => (
                      <option key={f.SEQ_TIPO_FORMATO_RESPOSTA} value={String(f.SEQ_TIPO_FORMATO_RESPOSTA)}>
                        {f.DSC_TIPO_FORMATO_RESPOSTA}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variável *
                  </label>
                  <select
                    value={form.SEQ_TIPO_VARIAVEL_PERGUNTA}
                    onChange={(e) => updateField('SEQ_TIPO_VARIAVEL_PERGUNTA', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {lookups?.data.variaveis.map((v) => (
                      <option key={v.SEQ_TIPO_VARIAVEL_PERGUNTA} value={String(v.SEQ_TIPO_VARIAVEL_PERGUNTA)}>
                        {v.DSC_TIPO_VARIAVEL_PERGUNTA || `Variável ${v.SEQ_TIPO_VARIAVEL_PERGUNTA}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Periodicidade *
                  </label>
                  <select
                    value={form.SEQ_TIPO_PERIODICIDADE_PERGUNTA}
                    onChange={(e) => updateField('SEQ_TIPO_PERIODICIDADE_PERGUNTA', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {lookups?.data.periodicidades.map((p) => (
                      <option key={p.SEQ_TIPO_PERIODICIDADE_PERGUNTA} value={String(p.SEQ_TIPO_PERIODICIDADE_PERGUNTA)}>
                        {p.DSC_TIPO_PERIODICIDADE_PERGUNTA}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complemento
                </label>
                <textarea
                  value={form.DSC_COMPLEMENTO_PERGUNTA}
                  onChange={(e) => updateField('DSC_COMPLEMENTO_PERGUNTA', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Texto complementar (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Glossário (HTML)
                </label>
                <textarea
                  value={form.TXT_GLOSSARIO}
                  onChange={(e) => updateField('TXT_GLOSSARIO', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  placeholder="Texto de ajuda em HTML (opcional)"
                />
              </div>

              {/* Opções para multi-resposta / lista */}
              {mostrarOpcoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opções de resposta
                  </label>
                  <div className="space-y-2">
                    {form.opcoes.map((opcao, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opcao}
                          onChange={(e) => updateOpcao(i, e.target.value)}
                          className="flex-1 px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder={`Opção ${i + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOpcao(i)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOpcao}
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar opção
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {mutation.error && (
            <p className="text-sm text-red-600">
              {mutation.error instanceof Error ? mutation.error.message : 'Erro ao salvar'}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => { mutation.reset(); onClose(); }}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin inline" /> Salvando...</>
            ) : isEditing ? (
              'Salvar Alterações'
            ) : (
              'Criar Pergunta'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
