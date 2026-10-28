# Infraestrutura e Deploy em Produção — Plataforma Aula (CDF)

Este documento contém o guia completo de implantação da plataforma **Aula** na sua instância **Oracle Cloud A1 (ARM64, Ubuntu)**.

---

## 1. Visão Geral da Arquitetura na sua VM

A sua máquina já possui processos Docker rodando (incluindo o `lupa-caddy` nas portas 80 e 443 e um PostgreSQL legado em `127.0.0.1:5432`). Por isso, a arquitetura do **Aula** foi projetada para isolamento absoluto:

```
[ Usuário / Navegador ]
         │ (HTTPS :443)
         ▼
┌──────────────────────────────────────────────┐
│  Caddy Existente (container "lupa-caddy")    │
│  - Gera e renova certificados SSL automático │
│  - Roteia vhmedeiros.dev.br                  │
└──────────────────────┬───────────────────────┘
                       │ (HTTP interno :3005)
                       ▼
┌──────────────────────────────────────────────┐
│  Nginx do Aula (container "cdf-prod-nginx")   │
│  - X-Accel-Redirect (streaming 206 de vídeo) │
│  - Gzip / Cache longo de assets estáticos    │
│  - Rate-limit de login no nível do Nginx     │
└──────────────────────┬───────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│  Next.js App     │       │  Worker BullMQ   │
│  (cdf-prod-web)  │       │ (cdf-prod-worker)│
└────────┬─────────┘       └─────────┬────────┘
         │                           │
         └─────────────┬─────────────┘
                       │ (Rede interna cdf-network)
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│  PostgreSQL 17   │       │  Redis 7         │
│  (pgvector)      │       │  (Fila BullMQ)   │
└──────────────────┘       └──────────────────┘
```

- **Sem conflito de portas**: O PostgreSQL do Aula **não** expõe a porta 5432 no host. Fica restrito à rede privada do Docker (`cdf-network`).
- **Sem conflito de SSL**: O Caddy gerencia o domínio e o HTTPS com zero configuração de Certbot.
- **Porta interna do Aula**: O Nginx do Aula escuta em `127.0.0.1:3005`.

---

## 2. Passo a Passo de Implantação na VM

### Passo 1: Configurar o Domínio no Registro.br

No painel do **Registro.br** para o domínio `vhmedeiros.dev.br`:

- Crie ou edite o registro do tipo **A**:
  - **Nome:** `@` (ou subdomínio como `aula`)
  - **Tipo:** `A`
  - **Dados / IP:** IP público da sua VM Oracle Cloud (ex.: `129.xxx.xxx.xxx`)
- Se desejar usar com `www`:
  - Crie outro registro tipo **CNAME** para `www` apontando para `vhmedeiros.dev.br`.

---

### Passo 2: Clonar o Repositório na VM

Conecte-se na VM via SSH e clone o projeto:

```bash
cd ~
git clone https://github.com/vhmedeiros/cdf.git
cd cdf
```

---

### Passo 3: Criar o arquivo `.env.production`

Crie o arquivo de variáveis de ambiente:

```bash
cp .env.example .env.production
nano .env.production
```

Preencha os valores para produção:

```env
# Banco de Dados (Rede Interna Docker)
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=cdf_prod_user
POSTGRES_PASSWORD=SUA_SENHA_FORTE_AQUI
POSTGRES_DB=cdf_production
DATABASE_URL=postgres://cdf_prod_user:SUA_SENHA_FORTE_AQUI@db:5432/cdf_production

# Redis (Rede Interna Docker)
REDIS_URL=redis://redis:6379

# Origem da Aplicação (seu domínio com HTTPS)
WEBSERVER_ORIGIN=https://vhmedeiros.dev.br

# Google Drive (monte a chave da Service Account)
GOOGLE_SA_FILE=/run/secrets/gdrive_sa.json
STREAM_MODE=nginx
PROGRESS_COMPLETE_RATIO=0.9

# Configurações de E-mail (opcional para envio de convites e reset de senha)
EMAIL_SMTP_HOST=smtp.sendgrid.net
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=apikey
EMAIL_SMTP_PASSWORD=SUA_CHAVE_AQUI
EMAIL_FROM=suporte@vhmedeiros.dev.br
```

---

### Passo 4: Adicionar a Chave da Service Account do Google Drive

Coloque o arquivo JSON da sua Service Account na pasta `secrets`:

```bash
mkdir -p secrets
nano secrets/gdrive_sa.json
# Cole o JSON da sua Service Account e salve (Ctrl+O, Enter, Ctrl+X)
chmod 600 secrets/gdrive_sa.json
```

---

### Passo 5: Configurar o Caddy Existente (`lupa-caddy`)

No arquivo `~/dashboard-lupa/Caddyfile`, adicione o bloco do subdomínio `aula.vhmedeiros.dev.br`:

```caddyfile
aula.vhmedeiros.dev.br {
    reverse_proxy cdf-prod-nginx:80
}
```

Após salvar o `Caddyfile`, recarregue o Caddy sem reiniciar:

```bash
docker exec -w /etc/caddy lupa-caddy caddy reload
# ou reinicie o container:
docker restart lupa-caddy
```

---

### Passo 6: Executar o Deploy Automatizado

Dê permissão de execução ao script e inicie o deploy:

```bash
chmod +x deploy.sh infra/scripts/backup.sh
./deploy.sh
```

O script cuidará de:

1. Puxar o código atualizado do Git.
2. Buildar a imagem multi-stage do Next.js standalone otimizada para ARM64.
3. Subir o PostgreSQL 17 e o Redis.
4. Aplicar todas as migrações de banco automaticamente.
5. Iniciar os containers de aplicação Web, Worker e Nginx.
6. Testar o healthcheck da aplicação.

---

### Passo 7: Criar o Usuário Administrador Inicial

Para criar o primeiro usuário admin com acesso à plataforma em produção:

```bash
docker compose --env-file .env.production -f infra/compose.prod.yaml run --rm migrate npx tsx infra/scripts/seed.ts
```

---

## 3. Rotina de Backup Automático Diário

Configure o `cron` do Linux para fazer backup diário comprimido às 03:00 da manhã:

```bash
crontab -e
```

Adicione a linha:

```cron
0 3 * * * /home/ubuntu/cdf/infra/scripts/backup.sh >> /var/log/cdf_backup.log 2>&1
```

Os backups serão salvos em `/var/backups/cdf/` com retenção automática dos últimos 7 dias.

### Como Restaurar um Backup:

```bash
gunzip -c /var/backups/cdf/cdf_backup_YYYY-MM-DD.sql.gz | docker exec -i cdf-prod-db psql -U cdf_prod_user -d cdf_production
```
