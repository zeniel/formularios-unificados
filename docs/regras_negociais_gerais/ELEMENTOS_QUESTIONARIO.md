# Sistema de Elementos de Questionário

## Visão Geral

O sistema de questionários do CNJ utiliza um modelo baseado em **elementos** para construir formulários dinâmicos. Inspirado em ferramentas modernas como Notion, Typeform e Form.io, o modelo permite criar questionários flexíveis com layout rico, incluindo seções, textos explicativos, mídias e perguntas.

### Conceito Central

> **Tudo no formulário é um elemento posicionado em sequência.**

Um questionário é como um "jornal" ou "documento" onde vamos adicionando elementos que, juntos, compõem o formulário final. Elementos podem ser agrupados em seções que definem o layout visual.

---

## Tipos de Elementos

| Tipo | Descrição | Pode ter filhos? | Pode ser filho? |
|------|-----------|------------------|-----------------|
| `SECAO` | Agrupa elementos, define layout (colunas) | ✅ Sim | ❌ Não (sempre raiz) |
| `PERGUNTA` | Campo de input do usuário | ❌ Não | ✅ Sim |
| `TEXTO` | Conteúdo textual (título, parágrafo, callout) | ❌ Não | ✅ Sim |
| `MIDIA` | Imagem, vídeo, arquivo ou embed | ❌ Não | ✅ Sim |
| `SEPARADOR` | Divisor visual ou quebra de página | ❌ Não | ✅ Sim |

---

## Hierarquia e Aninhamento

### Regra: Apenas 1 Nível de Aninhamento

```
QUESTIONÁRIO
├── SECAO (raiz)
│   ├── PERGUNTA (filho)
│   ├── TEXTO (filho)
│   ├── MIDIA (filho)
│   └── SEPARADOR (filho)
├── SECAO (raiz)
│   └── ...
└── SEPARADOR (raiz, para quebra de página entre seções)
```

### Restrições

1. **SEÇÃO é sempre elemento raiz** - nunca pode estar dentro de outra seção
2. **Elementos não-seção podem ser raiz ou filho** - flexibilidade para casos simples
3. **Pertencimento definido por `SEQ_SECAO`** - se preenchido, elemento pertence àquela seção

### Constraint no Banco

```sql
-- Seções não podem ter SEQ_SECAO preenchido
CHECK (COD_TIPO_ELEMENTO != 'SECAO' OR SEQ_SECAO IS NULL)
```

---

## Sistema de Layout

### Seções Definem o Grid

Cada seção define quantas colunas seus filhos ocupam:

| `NUM_COLUNAS` | Comportamento |
|---------------|---------------|
| `1` | Elementos empilhados verticalmente (padrão) |
| `2` | Elementos fluem em grid de 2 colunas |

### Fluxo em Grid de 2 Colunas

```
┌─────────────────────────────────────────────┐
│ SEÇÃO: "Dados Pessoais" (NUM_COLUNAS = 2)   │
├─────────────────────┬───────────────────────┤
│ [PERGUNTA] Nome     │ [PERGUNTA] CPF        │  ← linha 1
├─────────────────────┼───────────────────────┤
│ [PERGUNTA] Email    │ [PERGUNTA] Telefone   │  ← linha 2
├─────────────────────┼───────────────────────┤
│ [TEXTO] Observação  │ [PERGUNTA] Cargo      │  ← linha 3
└─────────────────────┴───────────────────────┘
```

### Regra de Layout

> **Todos os elementos dentro de uma seção ocupam 1 célula do grid.**
> 
> Textos e mídias seguem o mesmo fluxo das perguntas - não há tratamento especial.

---

## Tipos de Texto

| Tipo | Uso | Renderização |
|------|-----|--------------|
| `PARAGRAFO` | Texto corrido explicativo | `<p>` |
| `TITULO` | Título de destaque dentro da seção | `<h3>` |
| `SUBTITULO` | Subtítulo secundário | `<h4>` |
| `CALLOUT` | Destaque/aviso importante | Box colorido |
| `INSTRUCAO` | Instrução de preenchimento | Texto em itálico |

### Estilos de Texto (para CALLOUT)

| Estilo | Cor | Uso |
|--------|-----|-----|
| `DEFAULT` | Cinza | Informação neutra |
| `INFO` | Azul | Dica ou informação adicional |
| `WARNING` | Amarelo | Atenção, cuidado |
| `DANGER` | Vermelho | Erro, impedimento |
| `SUCCESS` | Verde | Confirmação, sucesso |

---

## Tipos de Mídia

| Tipo | Descrição | Campos obrigatórios |
|------|-----------|---------------------|
| `IMAGEM` | Foto, ilustração, diagrama | `DSC_URL` |
| `VIDEO` | Vídeo explicativo (YouTube, Vimeo, MP4) | `DSC_URL` |
| `ARQUIVO` | PDF, documento para download | `DSC_URL` |
| `EMBED` | Conteúdo externo incorporado (iframe) | `DSC_URL` |

### Campos de Mídia

- `DSC_URL`: URL do recurso (obrigatório)
- `DSC_LEGENDA`: Texto exibido abaixo da mídia
- `DSC_ALT_TEXT`: Texto alternativo para acessibilidade

---

## Separadores e Quebra de Página

### Tipos de Separador

| `FLG_QUEBRA_PAGINA` | Comportamento |
|---------------------|---------------|
| `N` | Linha horizontal visual (`<hr>`) |
| `S` | Quebra de página (nova tela no wizard) |

### Posicionamento

- **Separador visual** (`N`): pode estar dentro ou fora de seção
- **Quebra de página** (`S`): geralmente entre seções (elemento raiz)

---

## Navegação: Modelo Wizard

Quando há quebras de página, o questionário é exibido como um **wizard** (assistente passo a passo).

### Estrutura Visual

```
┌─────────────────────────────────────────────────────────┐
│  [Logo CNJ]    Censo Judiciário 2024                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ● Identificação  ○ Estrutura  ○ Financeiro  ○ Envio   │
│  ════════════════                                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   SEÇÃO: Identificação do Tribunal                      │
│   ─────────────────────────────────                     │
│                                                         │
│   ┌─────────────────┐  ┌─────────────────┐             │
│   │ Nome do Tribunal│  │ Sigla           │             │
│   │ [____________] │  │ [____]          │             │
│   └─────────────────┘  └─────────────────┘             │
│                                                         │
│   ┌─────────────────┐  ┌─────────────────┐             │
│   │ UF              │  │ Esfera          │             │
│   │ [Selecione ▼]   │  │ [Selecione ▼]   │             │
│   └─────────────────┘  └─────────────────┘             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   💾 Rascunho salvo às 14:32                           │
│                                                         │
│                    [← Anterior]  [Próximo →]            │
│                                                         │
│   Página 1 de 4                        ████░░░░░░ 25%   │
└─────────────────────────────────────────────────────────┘
```

### Comportamento de Navegação

| Ação | Comportamento |
|------|---------------|
| **Próximo** | Valida campos obrigatórios da página atual → Salva rascunho → Avança |
| **Anterior** | Salva rascunho (sem validação) → Retorna |
| **Clique no passo** | Se já visitado, permite navegação direta |
| **Fechar/Sair** | Salva rascunho automaticamente |

### Barra de Progresso

Duas opções de exibição:

1. **Por páginas**: "Página 2 de 5"
2. **Por perguntas**: "45% concluído (27 de 60 perguntas)"

### Página Final: Revisão

Antes do envio, exibir resumo:

```
┌─────────────────────────────────────────────────────────┐
│  ○ Identificação  ○ Estrutura  ○ Financeiro  ● Revisão │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   📋 REVISÃO DO QUESTIONÁRIO                           │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │ Identificação                         [Editar]  │   │
│   │ • Nome: Tribunal de Justiça de São Paulo        │   │
│   │ • Sigla: TJSP                                   │   │
│   │ • UF: SP                                        │   │
│   │ • Esfera: Estadual                              │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │ Estrutura de Pessoal                  [Editar]  │   │
│   │ • Magistrados: 450                              │   │
│   │ • Servidores: 12.340                            │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ⚠️ 2 perguntas pendentes                             │
│                                                         │
│              [← Anterior]  [✓ Enviar Questionário]     │
└─────────────────────────────────────────────────────────┘
```

---

## Visibilidade Condicional

### Filtros em Elementos

Qualquer elemento pode ter um filtro de visibilidade:

```json
{
  "logica": "AND",
  "condicoes": [
    { "campo": "ESFERA", "operador": "IGUAL", "valor": "ESTADUAL" },
    { "campo": "PORTE", "operador": "EM", "valores": ["GRANDE", "MEDIO"] }
  ]
}
```

### Comportamento

| Elemento | Quando oculto |
|----------|---------------|
| `SECAO` | Seção inteira não aparece (incluindo filhos) |
| `PERGUNTA` | Pergunta não aparece, não é obrigatória |
| `TEXTO` | Texto não aparece |
| `MIDIA` | Mídia não aparece |
| `SEPARADOR` | Separador não aparece (pode afetar paginação) |

### Perguntas Ocultas (Expression Language)

Perguntas com `FLG_OCULTA = 'S'` são preenchidas automaticamente pelo sistema:

- Não aparecem no formulário
- Valor vem do resolver de Expression Language
- Usadas como fonte para filtros de visibilidade

---

## Ordenação de Elementos

### Campo `NUM_ORDEM`

- Inteiro sequencial dentro do questionário/versão
- Elementos raiz e filhos compartilham a mesma sequência
- Renderização respeita a ordem

### Exemplo de Ordenação

```
NUM_ORDEM | TIPO      | SEQ_SECAO | Descrição
----------|-----------|-----------|---------------------------
1         | SECAO     | NULL      | Seção "Identificação"
2         | PERGUNTA  | 1         | Nome (dentro da seção 1)
3         | PERGUNTA  | 1         | Email (dentro da seção 1)
4         | SEPARADOR | NULL      | Quebra de página
5         | SECAO     | NULL      | Seção "Estrutura"
6         | TEXTO     | 2         | Instrução (dentro da seção 2)
7         | PERGUNTA  | 2         | Qtd magistrados
```

---

## Seções Colapsáveis

### Flag `FLG_COLAPSAVEL`

Quando `S`, a seção pode ser expandida/recolhida pelo usuário (accordion).

### Comportamento

```
┌─────────────────────────────────────────────┐
│ ▼ Seção Expandida                           │
│   ┌─────────────────────────────────────┐   │
│   │ [Conteúdo visível]                  │   │
│   └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│ ▶ Seção Recolhida                           │
│   (clique para expandir)                    │
└─────────────────────────────────────────────┘
```

### Uso Típico

- Seções opcionais ou de detalhamento
- Formulários muito longos onde o usuário precisa de visão geral
- **Não recomendado** para seções com campos obrigatórios (pode confundir)

---

## Modelo de Dados

### Diagrama ER Simplificado

```
                    ┌─────────────────────┐
                    │ questionario_versao │
                    └──────────┬──────────┘
                               │
                               │ 1:N
                               ▼
                    ┌─────────────────────┐
                    │ elemento_questionario│
                    │─────────────────────│
                    │ SEQ_ELEMENTO (PK)   │
                    │ SEQ_QUESTIONARIO    │
                    │ SEQ_VERSAO          │
                    │ COD_TIPO_ELEMENTO   │◄─── ENUM
                    │ NUM_ORDEM           │
                    │ SEQ_SECAO (FK)  ────────────────┐
                    │ JSON_FILTRO_...     │           │
                    └──────────┬──────────┘           │
                               │                      │
           ┌───────────────────┼───────────────────┐  │
           │         1:1       │        1:1        │  │
           ▼                   ▼                   ▼  │
┌──────────────────┐ ┌──────────────────┐ ┌────────────────┐
│ secao_questionario│ │ texto_questionario│ │ midia_question.│
│──────────────────│ │──────────────────│ │────────────────│
│ SEQ_SECAO (PK)   │◄┤ SEQ_TEXTO (PK)   │ │ SEQ_MIDIA (PK) │
│ SEQ_ELEMENTO(FK) │ │ SEQ_ELEMENTO(FK) │ │ SEQ_ELEMENTO   │
│ DSC_TITULO       │ │ COD_TIPO_TEXTO   │ │ COD_TIPO_MIDIA │
│ NUM_COLUNAS      │ │ DSC_CONTEUDO     │ │ DSC_URL        │
│ FLG_COLAPSAVEL   │ │ COD_ESTILO       │ │ DSC_LEGENDA    │
└──────────────────┘ └──────────────────┘ └────────────────┘
           │
           └─────────────────────────────────────────────┘
                    Relacionamento SEQ_SECAO


┌──────────────────────┐     ┌────────────────┐
│ separador_questionario│     │    pergunta    │
│──────────────────────│     │────────────────│
│ SEQ_SEPARADOR (PK)   │     │ SEQ_PERGUNTA   │
│ SEQ_ELEMENTO (FK)    │     │ SEQ_ELEMENTO   │
│ FLG_QUEBRA_PAGINA    │     │ ... (existente)│
└──────────────────────┘     └────────────────┘
```

### Tabelas

| Tabela | Propósito |
|--------|-----------|
| `elemento_questionario` | Registro central de todos os elementos |
| `secao_questionario` | Detalhes específicos de seções |
| `texto_questionario` | Detalhes específicos de textos |
| `midia_questionario` | Detalhes específicos de mídias |
| `separador_questionario` | Detalhes específicos de separadores |
| `pergunta` | Tabela existente, recebe `SEQ_ELEMENTO` |

---

## Fluxo de Renderização

### 1. Carregar Elementos

```sql
SELECT e.*, s.*, t.*, m.*, sp.*, p.*
FROM elemento_questionario e
LEFT JOIN secao_questionario s ON s.SEQ_ELEMENTO = e.SEQ_ELEMENTO
LEFT JOIN texto_questionario t ON t.SEQ_ELEMENTO = e.SEQ_ELEMENTO
LEFT JOIN midia_questionario m ON m.SEQ_ELEMENTO = e.SEQ_ELEMENTO
LEFT JOIN separador_questionario sp ON sp.SEQ_ELEMENTO = e.SEQ_ELEMENTO
LEFT JOIN pergunta p ON p.SEQ_ELEMENTO = e.SEQ_ELEMENTO
WHERE e.SEQ_QUESTIONARIO = ? AND e.SEQ_VERSAO = ?
ORDER BY e.NUM_ORDEM
```

### 2. Montar Árvore

```typescript
function montarArvore(elementos: ElementoDB[]): ElementoRaiz[] {
  const secoes = new Map<number, ElementoSecao>();
  const raiz: ElementoRaiz[] = [];
  
  // Primeiro: criar seções
  for (const e of elementos.filter(e => e.tipo === 'SECAO')) {
    const secao = mapearSecao(e);
    secao.filhos = [];
    secoes.set(secao.secao.seqSecao, secao);
    raiz.push(secao);
  }
  
  // Segundo: distribuir elementos
  for (const e of elementos.filter(e => e.tipo !== 'SECAO')) {
    const elemento = mapearElemento(e);
    if (elemento.seqSecao) {
      secoes.get(elemento.seqSecao)?.filhos.push(elemento);
    } else {
      raiz.push(elemento);
    }
  }
  
  return raiz;
}
```

### 3. Resolver Visibilidade

```typescript
function filtrarVisiveis(
  elementos: ElementoRaiz[], 
  contexto: ContextoEL
): ElementoRaiz[] {
  return elementos
    .filter(e => avaliarVisibilidade(e, contexto))
    .map(e => {
      if (e.tipo === 'SECAO') {
        return {
          ...e,
          filhos: e.filhos.filter(f => avaliarVisibilidade(f, contexto))
        };
      }
      return e;
    });
}
```

### 4. Dividir em Páginas

```typescript
function dividirEmPaginas(elementos: ElementoRaiz[]): Pagina[] {
  const paginas: Pagina[] = [];
  let paginaAtual: ElementoRaiz[] = [];
  
  for (const elemento of elementos) {
    if (elemento.tipo === 'SEPARADOR' && elemento.separador.quebraPagina) {
      if (paginaAtual.length > 0) {
        paginas.push({ elementos: paginaAtual });
        paginaAtual = [];
      }
      // Separador de quebra não entra na página
    } else {
      paginaAtual.push(elemento);
    }
  }
  
  if (paginaAtual.length > 0) {
    paginas.push({ elementos: paginaAtual });
  }
  
  return paginas;
}
```

### 5. Renderizar Página Atual

```tsx
function PaginaQuestionario({ pagina, contexto }: Props) {
  return (
    <div className="space-y-8">
      {pagina.elementos.map(elemento => (
        <ElementoRenderer 
          key={elemento.seqElemento}
          elemento={elemento}
          contexto={contexto}
        />
      ))}
    </div>
  );
}
```

---

## Exemplos de Estrutura

### Exemplo 1: Questionário Simples (1 página)

```
QUESTIONÁRIO: "Pesquisa de Satisfação"
│
├── SECAO "Identificação" (1 coluna)
│   ├── TEXTO tipo=INSTRUCAO "Preencha seus dados"
│   ├── PERGUNTA "Nome"
│   └── PERGUNTA "Email"
│
├── SEPARADOR (visual, N)
│
└── SECAO "Avaliação" (1 coluna)
    ├── PERGUNTA "Nota geral" (1-10)
    └── PERGUNTA "Comentários" (textarea)
```

### Exemplo 2: Questionário Multi-página

```
QUESTIONÁRIO: "Censo Judiciário 2024"
│
├── SECAO "Identificação" (2 colunas)
│   ├── PERGUNTA "Nome do tribunal"
│   ├── PERGUNTA "Sigla"
│   ├── PERGUNTA "UF"
│   └── PERGUNTA "Esfera"
│
├── SEPARADOR (quebra página, S)          ─── PÁGINA 2
│
├── SECAO "Estrutura de Pessoal" (1 coluna)
│   ├── TEXTO tipo=CALLOUT estilo=INFO 
│   │   "Considere apenas servidores ativos em 31/12"
│   ├── PERGUNTA "Qtd magistrados"
│   │   └── filtro: { ESFERA IN [ESTADUAL, FEDERAL] }
│   └── PERGUNTA "Qtd servidores"
│
├── SEPARADOR (quebra página, S)          ─── PÁGINA 3
│
├── SECAO "Dados Financeiros" (2 colunas)
│   ├── MIDIA tipo=IMAGEM "grafico-orcamento.png"
│   ├── TEXTO tipo=SUBTITULO "Orçamento Anual"
│   ├── PERGUNTA "Receita total"
│   └── PERGUNTA "Despesa total"
│
└── SEPARADOR (quebra página, S)          ─── PÁGINA 4 (Revisão)
```

### Exemplo 3: Com Visibilidade Condicional

```
QUESTIONÁRIO: "Cadastro de Unidade"
│
├── SECAO "Tipo de Unidade" (1 coluna)
│   └── PERGUNTA "Tipo" [VARA, GABINETE, SECRETARIA]
│
├── SECAO "Dados da Vara" (2 colunas)
│   │   filtro: { TIPO = "VARA" }          ← Só aparece se tipo=VARA
│   ├── PERGUNTA "Competência"
│   ├── PERGUNTA "Vara única?"
│   └── PERGUNTA "Juizados especiais?"
│
├── SECAO "Dados do Gabinete" (1 coluna)
│   │   filtro: { TIPO = "GABINETE" }      ← Só aparece se tipo=GABINETE
│   ├── PERGUNTA "Nome do magistrado"
│   └── PERGUNTA "Assessores"
│
└── SECAO "Dados da Secretaria" (1 coluna)
    │   filtro: { TIPO = "SECRETARIA" }    ← Só aparece se tipo=SECRETARIA
    └── PERGUNTA "Responsável"
```

---

## Versionamento

### Elementos e Versões

Os elementos pertencem a uma **versão específica** do questionário:

- `SEQ_QUESTIONARIO` + `SEQ_VERSAO` identificam a versão
- Ao criar nova versão, elementos são **copiados**
- Editar elemento em rascunho não afeta versão publicada

### Fluxo de Publicação

```
┌─────────────────┐     ┌─────────────────┐
│   RASCUNHO      │     │   PUBLICADO     │
│   (editável)    │────▶│   (imutável)    │
│                 │     │                 │
│ • Elementos     │     │ • Elementos     │
│ • Perguntas     │     │ • Perguntas     │
│ • Seções        │     │ • Seções        │
└─────────────────┘     └─────────────────┘
        │
        │ Criar nova versão
        ▼
┌─────────────────┐
│   RASCUNHO v2   │
│   (cópia)       │
└─────────────────┘
```

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **Elemento** | Unidade básica do formulário (seção, pergunta, texto, mídia, separador) |
| **Seção** | Container que agrupa elementos e define layout |
| **Elemento raiz** | Elemento sem SEQ_SECAO (no nível principal) |
| **Elemento filho** | Elemento com SEQ_SECAO (dentro de uma seção) |
| **Grid** | Sistema de layout em colunas definido pela seção |
| **Wizard** | Interface de navegação passo a passo por páginas |
| **Quebra de página** | Separador que divide o formulário em páginas do wizard |
| **Filtro de visibilidade** | Condição JSON que determina se elemento aparece |
| **Expression Language** | Sistema de resolução automática de valores (EL_ESFERA, EL_UF, etc.) |
| **Pergunta oculta** | Pergunta preenchida automaticamente, não exibida ao usuário |

---

## Próximos Passos

1. [ ] Aplicar migration `007_elementos_questionario.sql`
2. [ ] Atualizar Prisma schema (`npx prisma db pull`)
3. [ ] Implementar queries de carregamento de elementos
4. [ ] Criar componentes de renderização (SecaoRenderer, TextoBlock, etc.)
5. [ ] Implementar wizard de navegação multi-página
6. [ ] Criar UI de administração para construir elementos (drag-and-drop)
7. [ ] Migrar questionários existentes para novo modelo
