# Sistema de Questionários - Regras de Negócio v3

## Princípio Único

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│         PUBLICOU?  →  IMUTÁVEL.  →  NOVA VERSÃO.       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Não importa se tem respostas ou não. **Publicado = Imutável**.

---

## Estados

| Estado | Editável | Visível para Respondentes |
|--------|----------|---------------------------|
| **RASCUNHO** | ✅ Sim | ❌ Não |
| **PUBLICADO** | ❌ Não | ✅ Sim |

```
┌──────────────┐                      ┌──────────────┐
│   RASCUNHO   │ ────Publicar────►   │  PUBLICADO   │
│   (editável) │                      │  (imutável)  │
└──────────────┘                      └──────────────┘
        ▲                                    │
        │          Criar Nova Versão         │
        └────────────────────────────────────┘
```

---

## Regras por Entidade

### Questionário

| Ação | RASCUNHO | PUBLICADO |
|------|----------|-----------|
| Editar nome/descrição | ✅ | ❌ |
| Adicionar pergunta | ✅ | ❌ |
| Remover pergunta | ✅ | ❌ |
| Reordenar perguntas | ✅ | ❌ |
| Publicar | ✅ | — |
| Criar nova versão | — | ✅ |

### Pergunta

| Ação | RASCUNHO | PUBLICADO |
|------|----------|-----------|
| Editar texto | ✅ | ❌ |
| Editar opções | ✅ | ❌ |
| Mudar categoria | ✅ | ❌ |
| Mudar tipo de resposta | ✅ | ❌ |
| Mudar ordem | ✅ | ❌ |

### Categoria

| Ação | RASCUNHO | PUBLICADO |
|------|----------|-----------|
| Editar nome | ✅ | ❌ |
| Editar ordem | ✅ | ❌ |
| Mudar pai | ✅ | ❌ |

---

## Versionamento

### Estrutura

Todas as entidades principais têm:

```
SEQ_*_BASE    →  Aponta para a RAIZ (NULL se é a raiz)
NUM_VERSAO    →  1, 2, 3...
```

### Cálculo da Raiz

```sql
SEQ_QUESTIONARIO_RAIZ = COALESCE(SEQ_QUESTIONARIO_BASE, SEQ_QUESTIONARIO)
SEQ_PERGUNTA_RAIZ     = COALESCE(SEQ_PERGUNTA_BASE, SEQ_PERGUNTA)
SEQ_CATEGORIA_RAIZ    = COALESCE(SEQ_CATEGORIA_BASE, SEQ_CATEGORIA_PERGUNTA)
```

### Exemplo Visual

```
Questionário "Pesquisa 2024"
├── v1 (SEQ=10, BASE=NULL)  ←── RAIZ
├── v2 (SEQ=25, BASE=10)
└── v3 (SEQ=42, BASE=10)    ←── Todas apontam para v1

Para relatórios: WHERE SEQ_QUESTIONARIO_RAIZ = 10
```

---

## Relacionamentos

### Pergunta ↔ Questionário

**Novo sistema (1:N):**
```
pergunta.SEQ_QUESTIONARIO  →  Vínculo direto
pergunta.NUM_ORDEM         →  Ordem no questionário
```

**Sistema legado (N:N):**
```
questionario_pergunta  →  Mantido para compatibilidade
```

**Regra:** Uma pergunta pertence a UM questionário. Não há compartilhamento.

### Usar como Modelo (UI only)

Ao criar pergunta, a interface pode:
1. Listar perguntas existentes como "modelos"
2. Auto-preencher campos
3. Usuário edita e salva como nova pergunta

Não há vínculo persistido — é apenas facilitador de UI.

---

## Fluxos de Trabalho

### 1. Criar Questionário Novo

```
1. Admin cria questionário             → Status: RASCUNHO
2. Admin adiciona categorias           → Status: RASCUNHO
3. Admin cria perguntas               → Status: RASCUNHO
4. Admin organiza ordem
5. Admin revisa tudo
6. Admin clica "Publicar"
   └── Questionário.DSC_STATUS = 'PUBLICADO'
   └── Questionário.DAT_PUBLICACAO = NOW()
   └── Todas perguntas.DSC_STATUS = 'PUBLICADO'
   └── Todas perguntas.DAT_PUBLICACAO = NOW()
   └── Categorias vinculadas.DSC_STATUS = 'PUBLICADO'
7. Questionário visível para respondentes
```

### 2. Alterar Questionário Publicado

```
1. Admin acessa questionário PUBLICADO
2. Sistema mostra: "Imutável. Criar nova versão?"
3. Admin confirma
4. Sistema cria:
   └── Novo questionário (RASCUNHO)
       ├── SEQ_QUESTIONARIO_BASE = raiz do original
       ├── NUM_VERSAO = max + 1
       └── Cópia de todas as perguntas (RASCUNHO)
5. Admin faz alterações
6. Admin publica nova versão
7. Versão antiga permanece intacta
```

### 3. Corrigir Erro em Pergunta Publicada

```
Mesmo fluxo do item 2.
Não existe "corrigir" — existe "criar versão corrigida".
```

---

## Validações da Aplicação

### Antes de qualquer edição

```typescript
function podeEditar(entidade: { DSC_STATUS: string }): boolean {
  return entidade.DSC_STATUS === 'RASCUNHO';
}
```

### Antes de publicar questionário

```typescript
function podePublicar(questionario): ValidationResult {
  if (questionario.DSC_STATUS === 'PUBLICADO') {
    return { ok: false, erro: 'Já está publicado' };
  }
  
  const perguntas = buscarPerguntasDoQuestionario(questionario.id);
  if (perguntas.length === 0) {
    return { ok: false, erro: 'Adicione ao menos uma pergunta' };
  }
  
  return { ok: true };
}
```

### Publicação (cascata)

```typescript
async function publicarQuestionario(id: number, usuario: string) {
  const agora = new Date();
  
  // Publicar questionário
  await db.questionario.update({
    where: { SEQ_QUESTIONARIO: id },
    data: {
      DSC_STATUS: 'PUBLICADO',
      DAT_PUBLICACAO: agora,
      USU_PUBLICACAO: usuario
    }
  });
  
  // Publicar perguntas (cascata)
  await db.pergunta.updateMany({
    where: { 
      SEQ_QUESTIONARIO: id,
      DSC_STATUS: 'RASCUNHO'
    },
    data: {
      DSC_STATUS: 'PUBLICADO',
      DAT_PUBLICACAO: agora,
      USU_PUBLICACAO: usuario
    }
  });
  
  // Publicar categorias vinculadas (cascata)
  const categoriaIds = await db.pergunta.findMany({
    where: { SEQ_QUESTIONARIO: id },
    select: { SEQ_CATEGORIA_PERGUNTA: true },
    distinct: ['SEQ_CATEGORIA_PERGUNTA']
  });
  
  await db.categoria_pergunta.updateMany({
    where: {
      SEQ_CATEGORIA_PERGUNTA: { in: categoriaIds },
      DSC_STATUS: 'RASCUNHO'
    },
    data: {
      DSC_STATUS: 'PUBLICADO',
      DAT_PUBLICACAO: agora,
      USU_PUBLICACAO: usuario
    }
  });
}
```

---

## Consultas SQL Frequentes

### Listar questionários (admin)

```sql
SELECT * FROM vw_questionario_admin
ORDER BY DAT_CRIACAO_QUESTIONARIO DESC;
```

### Buscar última versão publicada de um questionário

```sql
SELECT * FROM vw_questionario_admin
WHERE SEQ_QUESTIONARIO_RAIZ = ?
  AND DSC_STATUS = 'PUBLICADO'
ORDER BY NUM_VERSAO DESC
LIMIT 1;
```

### Perguntas de um questionário (ordenadas)

```sql
SELECT * FROM vw_pergunta_admin
WHERE SEQ_QUESTIONARIO = ?
ORDER BY NUM_ORDEM;
```

### Todas as versões de um questionário

```sql
SELECT * FROM vw_questionario_versoes
WHERE SEQ_QUESTIONARIO_RAIZ = ?;
```

### Relatório agregando respostas de todas as versões

```sql
SELECT 
    COALESCE(p.SEQ_PERGUNTA_BASE, p.SEQ_PERGUNTA) AS pergunta_conceito,
    MIN(p.DSC_PERGUNTA) AS texto_original,
    COUNT(r.SEQ_RESPOSTA) AS total_respostas
FROM pergunta p
LEFT JOIN resposta r ON r.SEQ_PERGUNTA = p.SEQ_PERGUNTA
GROUP BY pergunta_conceito;
```

---

## Campos Deprecated (Sistema Legado)

| Tabela | Campo | Novo Campo |
|--------|-------|------------|
| `questionario` | `FLG_ATIVO` | `DSC_STATUS` |
| `pergunta` | `FLG_ATIVA` | `DSC_STATUS` |
| `questionario_pergunta` | `FLG_ATIVO` | (tabela mantida para legado) |

**Regra:** Novos registros sempre usam os campos novos. Sistema legado continua funcionando com campos antigos.

---

## Resumo em Uma Frase

> Rascunho é rascunho. Publicou, virou pedra. Quer mudar a pedra? Faz outra.
