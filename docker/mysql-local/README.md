# MySQL Local (Docker)

Imagem MySQL 8.0 local para desenvolvimento. Carrega automaticamente dumps SQL no primeiro startup.

## Como usar

### 1. Coloque o dump na pasta `initdb/`

```bash
# Copie seu dump para a pasta de inicialização
cp /caminho/do/dump.sql ./initdb/01_dump.sql
```

Os arquivos em `initdb/` são executados em **ordem alfabética** no primeiro startup.
Use prefixos numéricos para controlar a ordem:

```
initdb/
├── 01_dump.sql                        # Dump principal do banco
├── 02_006_filtros_json_estruturado.sql # Migration de filtros (opcional)
└── ...
```

> **Importante:** Os scripts só rodam na **primeira vez** que o container sobe (quando o volume está vazio). Para re-executar, destrua o volume com `docker compose down -v`.

### 2. Suba o container

```bash
cd docker/mysql-local
docker compose up -d
```

### 3. Acompanhe os logs (importação pode demorar)

```bash
docker compose logs -f mysql
```

Aguarde a mensagem: `ready for connections`

### 4. Conecte

| Parâmetro | Valor |
|-----------|-------|
| Host      | `localhost` |
| Porta     | `3306` |
| Database  | `questionario_sustentavel_dpj` |
| User root | `root` / `root` |
| User app  | `questionario` / `questionario` |

**DATABASE_URL para Prisma:**

```
mysql://questionario:questionario@localhost:3306/questionario_sustentavel_dpj
```

### 5. Comandos úteis

```bash
# Parar
docker compose down

# Parar e apagar dados (re-executa dumps no próximo up)
docker compose down -v

# Conectar via CLI
docker exec -it formularios-mysql mysql -u questionario -pquestionario questionario_sustentavel_dpj

# Conectar como root
docker exec -it formularios-mysql mysql -u root -proot

# Importar um dump manualmente (sem recriar o container)
docker exec -i formularios-mysql mysql -u root -proot questionario_sustentavel_dpj < /caminho/do/dump.sql
```
