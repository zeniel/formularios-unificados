# Kubernetes (Kustomize)

Manifests para deploy no cluster CNJ. Cada aplicação do monorepo tem seu próprio diretório.

## Estrutura

- **base/** + **overlays/** – Base única e overlays por ambiente (staging-cnj, production-cnj) com Ingress, ConfigMap, PV/PVC. Serviço principal: `formularios-unificados-admin`.
- **formularios-unificados-admin/** – UI de administração de formulários (Next.js, porta 3000)
- **corporativo-proxy/** – API proxy do corporativo (Next.js, porta 3001)

Cada app tem:

- `base/` – Deployment e Service
- `overlays/staging-cnj/` e `overlays/production-cnj/` – Namespace `dcor-formularios-unificados-cnj`, image tag

## Pipeline GitLab

O `.gitlab-ci.yml` na raiz do repositório:

1. **build** – Prepare: atualiza namespace e image nos overlays (uma job por app por ambiente).
2. **upload** – Build e push das imagens Docker (`formularios-unificados-admin`, `formularios-corporativo-proxy`).
3. **deploy** – Deploy manual no cluster (uma job por app por ambiente).

Variáveis de ambiente no GitLab:

- `NEXUS_USERNAME` / `NEXUS_PASSWORD` – Login no registry `registry.cnj.jus.br`.
- `KUBE_NAMESPACE` – Definido pelo environment (`dcor-formularios-unificados-cnj`).

Imagens geradas:

- `registry.cnj.jus.br/dcor/formularios-unificados-admin:$CI_COMMIT_REF_NAME`
- `registry.cnj.jus.br/dcor/formularios-corporativo-proxy:$CI_COMMIT_REF_NAME`

## Ingress

- **Staging:** `wwwh.cnj.jus.br/formularios-unificados-admin`, `formularios-unificados-admin.stg.cloud.cnj.jus.br/formularios-unificados-admin`
- **Produção:** `www.cnj.jus.br/formularios-unificados-admin`, `formularios-unificados-admin.cloud.cnj.jus.br/formularios-unificados-admin`

## Testar localmente

```bash
# Aplicar overlay de staging (dry-run)
kubectl apply --dry-run=client -k formularios-unificados-admin/overlays/staging-cnj
kubectl apply --dry-run=client -k corporativo-proxy/overlays/staging-cnj
```

## Health check

As duas aplicações expõem `GET /api/health` para liveness e readiness no Kubernetes.
