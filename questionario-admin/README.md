# Questionário Admin - Sistema de Administração

Interface administrativa para gerenciamento de questionários, perguntas e categorias.

## 🚀 Tecnologias

- **Next.js 14** (App Router)
- **TypeScript**
- **Prisma** (ORM)
- **MySQL** (banco existente)
- **TailwindCSS**
- **React Query** (cache e estado)
- **Docker** (deploy)

## 📋 Pré-requisitos

- Node.js 20+
- Acesso ao banco MySQL
- Credenciais do portal corporativo CNJ (para autenticação)

## 🔧 Instalação

```bash
# Clonar repositório
git clone [repo-url]
cd questionario-admin

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas configurações

# Gerar Prisma Client
npm run db:generate

# Rodar em desenvolvimento
npm run dev
```

## 🔐 Autenticação

O sistema utiliza a credencial corporativa CNJ (SCA). O fluxo é:

1. Usuário acessa o portal corporativo
2. Portal redireciona para `/auth/callback?c=CREDENCIAL`
3. Sistema valida credencial e cria sessão
4. Usuário navega com sessão em cookie

## 👤 Perfis do Sistema

| Perfil | Permissões |
|--------|------------|
| **ADMINISTRADOR** | Acesso total, gestão de usuários e metadados |
| **VISUALIZADOR** | Apenas visualização de questionários e perguntas |
| **PESQUISADOR** | Criar/editar questionários, ver respostas |
| **PESQUISADO** | Responder formulários |

## 📁 Estrutura do Projeto

```
src/
├── app/                    # App Router (páginas e rotas)
│   ├── auth/              # Autenticação
│   ├── questionarios/     # CRUD questionários
│   ├── perguntas/        # CRUD perguntas
│   ├── categorias/       # CRUD categorias
│   └── api/              # API Routes
├── components/            # Componentes React
│   ├── layout/           # Layout (sidebar, header)
│   ├── ui/               # Componentes base (buttons, inputs)
│   └── [feature]/        # Componentes por feature
├── lib/                   # Bibliotecas e utilitários
│   ├── auth/             # Autenticação e sessão
│   ├── types/            # TypeScript types
│   └── utils.ts          # Helpers
└── prisma/               # Schema e migrations
```

## 🗃️ Modelo de Dados

### Princípio de Imutabilidade

> **PUBLICADO = IMUTÁVEL**

- `RASCUNHO`: editável, invisível para respondentes
- `PUBLICADO`: imutável, visível para respondentes
- Para alterar algo publicado: criar nova versão

### Versionamento

Todas as entidades principais (questionário, pergunta, categoria) têm:

```sql
SEQ_*_BASE    -- Aponta para a raiz (NULL se é a raiz)
NUM_VERSAO    -- 1, 2, 3...
DSC_STATUS    -- RASCUNHO | PUBLICADO
```

### Escopo de Resposta

Configurável por questionário:

- `TRIBUNAL`: 1 resposta por tribunal (padrão)
- `ORGAO`: 1 resposta por departamento
- `INDIVIDUAL`: 1 resposta por pessoa

## 🐳 Deploy (Docker)

```bash
# Build
docker build -t questionario-admin .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL="mysql://..." \
  -e NEXT_PUBLIC_CNJ_CORPORATIVO_URL="https://..." \
  questionario-admin
```

## 📝 Scripts

```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run start        # Iniciar produção
npm run lint         # Verificar código
npm run db:generate  # Gerar Prisma Client
npm run db:studio    # Abrir Prisma Studio
```

## 📖 Documentação

- [Regras de Negócio](./docs/BUSINESS_RULES.md)
- [Modelo de Dados](./docs/erd_v3.mermaid)
- [Migrations](./migrations/)

## 🤝 Contribuição

1. Criar branch: `git checkout -b feature/nome-feature`
2. Commitar: `git commit -m 'feat: descrição'`
3. Push: `git push origin feature/nome-feature`
4. Abrir Pull Request

## 📄 Licença

Uso interno CNJ.
