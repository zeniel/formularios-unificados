# Contexto do Projeto: Formulários Unificados (Monorepo)

## Visão Geral

Sistema de administração para formulários dinâmicos (questionários) do CNJ. Substituição de sistema legado PHP+Angular. Monorepo com npm workspaces contendo a interface admin, proxy do corporativo e código compartilhado.

## Estrutura do Monorepo

```
formularios-unificados/           # Workspace root (npm workspaces)
├── packages/
│   └── shared/                   # @formularios/shared - código compartilhado
│       └── src/
│           ├── index.ts
│           ├── filtro-types.ts          # Tipos do filtro JSON de visibilidade
│           ├── filtro-evaluator.ts      # Avalia se pergunta deve aparecer
│           ├── corporativo-api-client.ts # Cliente REST para corporativo-proxy
│           └── expression-language-resolver.ts # Resolvers das ELs
├── questionario-admin/           # App admin - Next.js 14 + Prisma
│   ├── src/
│   │   ├── app/                  # App Router (pages, API routes)
│   │   ├── components/           # React components (dashboard, layout)
│   │   ├── lib/
│   │   │   ├── auth/             # Credencial CNJ + sessão
│   │   │   ├── corporativo/      # Client corporativo (DB direto + API)
│   │   │   ├── filtros/          # Filtros admin (CRUD, avaliador DB-backed)
│   │   │   └── types/            # Tipos do questionário
│   │   └── middleware.ts
│   └── prisma/schema.prisma
├── corporativo-proxy/            # API proxy - Next.js 14 (porta 3001)
│   └── src/
│       ├── app/api/              # Endpoints REST: tribunais, orgaos, usuarios
│       └── lib/                  # DB connection + types
└── docs/                         # Documentação
```

## Stack

- **Framework**: Next.js 14 (App Router) nas apps
- **ORM**: Prisma (banco MySQL existente) no questionario-admin
- **UI**: shadcn/ui + Tailwind CSS 3
- **Estado**: React Query (TanStack Query)
- **Autenticação**: Credencial corporativa CNJ (não é OAuth)
- **Monorepo**: npm workspaces

## Modelo de Dados Principal

### Versionamento
- Questionário tem versões (NUM_VERSAO)
- Status: RASCUNHO → PUBLICADO (imutável)
- Publicar questionário publica todas as perguntas em cascata
- Para editar publicado: criar nova versão

### Perguntas Ocultas (Expression Language)
- Perguntas com `FLG_OCULTA = 'S'` são preenchidas automaticamente
- Campo `COD_EXPRESSION_LANGUAGE` aponta para tabela `expression_language`
- ELs disponíveis: EL_ESFERA, EL_UF, EL_SIGLA_TRIBUNAL, EL_PORTE, EL_ANO_ATUAL, etc.
- Valores vêm do corporativo-proxy ou são calculados
- Resolvers implementados em `packages/shared/src/expression-language-resolver.ts`

### Filtros de Visibilidade
- Campo `JSON_FILTRO_VISIBILIDADE` em cada pergunta
- Formato JSON estruturado (não texto livre)
- Compara valores de outras perguntas (incluindo ocultas)
- Tipos e avaliador em `packages/shared/src/filtro-types.ts` e `filtro-evaluator.ts`
- Admin CRUD em `questionario-admin/src/lib/filtros/`

Exemplo de filtro:
```json
{
 "logica": "AND",
 "condicoes": [
 { "campo": "ESFERA", "operador": "IGUAL", "valor": "ESTADUAL" },
 { "campo": "UF", "operador": "EM", "valores": ["SP", "RJ", "MG"] }
 ]
}
```

### Escopo de Resposta
- Configurável por questionário: TRIBUNAL, ORGAO, ou INDIVIDUAL
- Define granularidade das respostas

## Autenticação CNJ

- Usuário vem do portal corporativo com `?c=CREDENCIAL` na URL
- Credencial é Base64 + hash MD5
- Separador: `SEPARADORCREDENCIALCNJ` + sufixo (`;` ou `|`)
- Contém: seqUsuario, seqOrgao, seqPerfil, timeToLive
- Sessão via cookies httpOnly (8h TTL)

## Migrations Pendentes

A migration definitiva a aplicar é a `006_filtros_json_estruturado.sql`:
- Cria tabela `expression_language`
- Adiciona campos `FLG_OCULTA`, `COD_EXPRESSION_LANGUAGE`, `JSON_FILTRO_VISIBILIDADE` em `pergunta`
- Cria tabela `operador_filtro`

## Volumes de Dados

- ~59 questionários
- ~10.300 perguntas
- ~4.6M respostas

## Decisões Tomadas

1. **Tudo é pergunta/resposta** - metadados do contexto (esfera, UF) são perguntas ocultas
2. **Filtros JSON estruturados** - não DSL texto, UI constrói o JSON
3. **Proxy separado** para corporativo - não acesso direto ao banco
4. **Sem tabela de perfis local** - perfis vêm da credencial corporativa
5. **FK entre pergunta e expression_language** - integridade garantida
6. **Monorepo npm workspaces** - código compartilhado em `@formularios/shared`

## Próximos Passos

1. [ ] Aplicar migration 006
2. [ ] Integrar `@formularios/shared` no questionario-admin
3. [ ] Criar UI para construir filtros (form builder)
4. [ ] Implementar CRUD de questionários
5. [ ] Implementar CRUD de perguntas
6. [ ] Tela de publicação com preview

## Comandos Úteis

```bash
# Instalar todas as dependências (workspaces)
npm install

# Rodar admin (porta 3000)
npm run dev:admin

# Rodar proxy corporativo (porta 3001)
npm run dev:proxy

# Rodar ambos ao mesmo tempo
npm run dev

# Gerar schema Prisma do banco existente
npm run db:generate

# Abrir Prisma Studio
npm run db:studio

# Aplicar migration
mysql -u root -p questionario < questionario-admin/migrations/006_filtros_json_estruturado.sql
```

## Contato com Banco

```
questionario-admin → MySQL (banco questionario)
corporativo-proxy → MySQL (banco corporativo)
```
