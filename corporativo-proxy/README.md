# Corporativo Proxy

Proxy API para acesso ao banco corporativo do CNJ.

## Endpoints

### Usuarios

```
GET /api/usuarios/:id
```

Retorna dados do usuario:
```json
{
  "success": true,
  "data": {
    "seqUsuario": 123,
    "nomUsuario": "Joao Silva",
    "numCpf": "12345678900",
    "dscEmail": "joao@cnj.jus.br",
    "seqOrgao": 456
  }
}
```

### Orgaos

```
GET /api/orgaos/:id
```

Retorna dados do orgao:
```json
{
  "success": true,
  "data": {
    "seqOrgao": 456,
    "dscOrgao": "Vara Civel de Brasilia",
    "seqOrgaoPai": 789,
    "tipo": "1_GRAU"
  }
}
```

```
GET /api/orgaos/:id/tribunal
```

Retorna o tribunal ao qual o orgao pertence (sobe a hierarquia):
```json
{
  "success": true,
  "data": {
    "seqOrgao": 100,
    "nome": "Tribunal de Justica do Distrito Federal",
    "sigla": "TJDFT",
    "esfera": "ESTADUAL",
    "uf": "DF",
    "porte": "GRANDE"
  }
}
```

### Tribunais

```
GET /api/tribunais
GET /api/tribunais?esfera=ESTADUAL
GET /api/tribunais?uf=SP
GET /api/tribunais?esfera=ESTADUAL&uf=SP
```

Lista todos os tribunais (com filtros opcionais):
```json
{
  "success": true,
  "data": [
    { "seqOrgao": 1, "nome": "...", "sigla": "TJSP", "esfera": "ESTADUAL", "uf": "SP" },
    ...
  ]
}
```

```
GET /api/tribunais/:id
```

Retorna dados de um tribunal especifico.

## Configuracao

Variaveis de ambiente (`.env.local`):

```env
CORPORATIVO_DB_HOST=localhost
CORPORATIVO_DB_PORT=3306
CORPORATIVO_DB_USER=usuario
CORPORATIVO_DB_PASSWORD=senha
CORPORATIVO_DB_NAME=corporativo
```

## Execucao

```bash
npm install
npm run dev    # porta 3001
```

## Deploy

O proxy deve rodar em rede interna, com acesso apenas pelos sistemas autorizados.
