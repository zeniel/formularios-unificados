# Instruções de Setup

## 1. Estrutura de Pastas

Copie os arquivos gerados para o projeto:

```bash
# Na raiz do questionario-admin
mkdir -p src/lib/filtros
mkdir -p src/lib/corporativo

# Copiar arquivos de filtros
cp filtro-types.ts src/lib/filtros/types.ts
cp filtro-evaluator.ts src/lib/filtros/evaluator.ts
cp expression-language-resolver.ts src/lib/filtros/expression-language.ts

# Copiar cliente do corporativo
cp corporativo-api-client.ts src/lib/corporativo/api.ts

# Copiar CLAUDE.md para raiz
cp CLAUDE.md ./
```

## 2. Aplicar Migration

```bash
# No MySQL
mysql -u root -p questionario < 006_filtros_json_estruturado.sql
```

## 3. Atualizar Prisma Schema

```bash
# Regenerar schema do banco
npx prisma db pull

# Gerar cliente
npx prisma generate
```

## 4. Configurar Corporativo Proxy

```bash
# Extrair e configurar
unzip corporativo-proxy.zip
cd corporativo-proxy

# Criar .env.local
cp .env.example .env.local
# Editar com credenciais do banco corporativo

# Instalar e rodar
npm install
npm run dev  # porta 3001
```

## 5. Variáveis de Ambiente (questionario-admin)

Adicionar ao `.env.local`:

```env
# Banco do questionário
DATABASE_URL="mysql://user:pass@localhost:3306/questionario"

# Proxy do corporativo
CORPORATIVO_PROXY_URL="http://localhost:3001"

# Autenticação CNJ
CNJ_PORTAL_URL="https://portal.cnj.jus.br"
CNJ_SISTEMA_ID="123"
```

## 6. Usando Claude Code

```bash
# Instalar
npm install -g @anthropic-ai/claude-code

# Iniciar no projeto
cd questionario-admin
claude

# O Claude lerá automaticamente o CLAUDE.md e terá todo o contexto
```
