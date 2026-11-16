# Infraestrutura da VM Oracle — Aula/CDF

> Documento de referência da máquina que hospeda o projeto Aula/CDF e os demais projetos.
> Última medição: **2026-11-16**.
> Hostname: `a1-rmcelestinos`
> Usuário: `ubuntu`
> Provedor: Oracle Cloud (série A1, Ampere ARM64)
> Acesso: SSH

---

## 1. Resumo executivo

| Item | Valor |
|---|---|
| Disco raiz | `/dev/sda1`, ext4, **184 GB** |
| Uso antes da limpeza | **52 GB usados (28%)**, 133 GB livres |
| Uso depois da limpeza | **36 GB usados (20%)**, **149 GB livres** |
| Cache de mídia do CDF | **20 GB** no volume `infra_cdf_prod_media` |
| Limite anterior do cache | 25 GB |
| Novo limite decidido | **50 GB** (`MEDIA_CACHE_MAX_GB=50`) |
| Folga se o cache chegar a 50 GB | aproximadamente **119 GB livres** |
| Volume separado para mídia | **não existe**; tudo está no disco raiz |
| Google Drive | Plano Pro com **5 TB**; cerca de 2 TB de cursos |

Reserva definida: o cache de mídia pode crescer até **50 GB**. Isso não é uma alocação física imediata; é o teto do LRU. Hoje ele usa 20 GB, então há cerca de 30 GB de crescimento permitido antes de bater no novo limite.

---

## 2. Identificação da máquina

- **Hostname:** `a1-rmcelestinos`
- **Provedor:** Oracle Cloud
- **Série:** A1 (Ampere ARM64)
- **Sistema:** Ubuntu, usuário `ubuntu`
- **Disco:** único volume raiz `sda` de 184 GB
- **Sem volume adicional montado** para mídia, banco ou cache

Layout de disco observado:

```text
sda                         184G
├─sda1   ext4   cloudimg-rootfs   /
└─sda15  vfat   UEFI              /boot/efi
```

### Domínios atendidos pelo Caddy

O container `lupa-caddy` faz o proxy externo:

| Domínio | Destino |
|---|---|
| `dash.vhmedeiros.dev.br` | `dash:8050` |
| `streamlit.vhmedeiros.dev.br` | `streamlit:8501` |
| `viali.vhmedeiros.dev.br` | `viali-node:3000` e `viali-frontend:80` |
| `aula.vhmedeiros.dev.br` | `cdf-prod-nginx:80` |
| `ls.vhmedeiros.dev.br` | `ls-landing:3000` |

Observação: o `Caddyfile` roteia `viali.*` para `viali-node` e `viali-frontend`, mas esses containers **não apareceram no `docker ps`** da medição. Verificar se o projeto está parado ou se o nome dos containers mudou.

---

## 3. Uso de disco

### 3.1 Antes da limpeza

| Item | Uso |
|---|---:|
| Disco total | 184 GB |
| Usado | 52 GB (28%) |
| Livre | 133 GB |
| `/var/lib/docker/volumes/infra_cdf_prod_media` | 20 GB |
| `/var/lib/containerd` | 18 GB |
| `/var/lib/docker` | 20 GB |
| `/var/log/journal` | 4,1 GB |
| `/home/ubuntu` | 6,1 GB |
| `/home/ubuntu/Lupa-Diarios` | 6,1 GB |
| `/usr` | 1,8 GB |
| `/opt` | 341 MB |
| `/boot` | 119 MB |

Docker antes da limpeza:

| Tipo | Tamanho | Recuperável |
|---|---:|---:|
| Imagens | 18,66 GB | 17,87 GB (95%) |
| Containers | 54,89 MB | 0 B |
| Volumes locais | 20,88 GB | 0 B |
| Build cache | 16,49 GB | 14,09 GB |

### 3.2 Limpeza executada

```bash
docker builder prune -f
docker image prune -f
sudo journalctl --vacuum-size=1G
sudo apt clean
```

Resultado:

- Build cache: **14,05 GB liberados**
- `docker image prune -f`: **0 B** (nenhuma imagem dangling)
- Journal: **3,0 GB liberados**
- `apt clean`: cache de pacotes limpo
- Total aproximado: **17 GB liberados**

### 3.3 Depois da limpeza

| Item | Uso |
|---|---:|
| Disco total | 184 GB |
| Usado | **36 GB (20%)** |
| Livre | **149 GB** |
| Imagens Docker | 5,463 GB |
| Imagens recuperáveis | 4,673 GB (85%) |
| Containers | 54,89 MB |
| Volumes locais | 20,88 GB |
| Build cache | 2,442 GB |

O volume de mídia continua com 20 GB. O disco agora tem folga confortável para novos projetos, builds e o pipeline 720p.

---

## 4. Containers em execução

| Container | Imagem | Status | Projeto |
|---|---|---|---|
| `ls-landing` | `ls-landing:latest` | Up 22h (healthy) | landing-page-ls |
| `cdf-prod-nginx` | `nginx:alpine` | Up 8 days | CDF |
| `cdf-prod-worker` | `cdf-app:prod` | Up 8 days | CDF |
| `cdf-prod-web` | `cdf-app:prod` | Up 8 days (healthy) | CDF |
| `cdf-prod-redis` | `redis:7-alpine` | Up 2 weeks (healthy) | CDF |
| `cdf-prod-db` | `pgvector/pgvector:pg17` | Up 2 weeks (healthy) | CDF |
| `lupa-diarios-app-1` | `lupa-diarios-app` | Up 3 months | Lupa-Diarios |
| `lupa-diarios-db-1` | `postgres:17-alpine` | Up 3 months | Lupa-Diarios |
| `lupa-caddy` | `caddy:2` | Up 2 weeks | proxy global |
| `lupa-dash` | `dashboard-lupa-dash` | Up 5 months (healthy) | dashboard-lupa |
| `lupa-streamlit` | `dashboard-lupa-streamlit` | Up 5 months (healthy) | dashboard-lupa |

---

## 5. Volumes Docker

| Volume | Tamanho | Função |
|---|---:|---|
| `infra_cdf_prod_media` | **20 GB** | cache local de vídeos do CDF |
| `lupa-diarios_db_data` | 138 MB | banco do Lupa-Diarios |
| `infra_cdf_prod_pgdata` | 99 MB | banco do CDF |
| `infra_cdf_prod_redis` | 8,9 MB | Redis/BullMQ do CDF |
| `dashboard-lupa_caddy_data` | 184 KB | dados do Caddy |
| `dashboard-lupa_caddy_config` | 16 KB | configuração do Caddy |
| `metadata.db` | 32 KB | metadados internos do Docker |
| `backingFsBlockDev` | 0 | interno do Docker |

**Não apagar** `infra_cdf_prod_media`, `infra_cdf_prod_pgdata` ou `lupa-diarios_db_data` sem backup. O primeiro é o cache de vídeos; os outros dois são bancos de dados.

---

## 6. Projetos na máquina

| Projeto | Diretório | Consumo observado | situação |
|---|---|---:|---|
| Lupa-Diarios | `/home/ubuntu/Lupa-Diarios` | 6,1 GB | app + Postgres rodando |
| CDF/Aula | `/home/ubuntu/cdf` | 4,8 MB de código + 20 GB de cache + 99 MB de banco | stack completa rodando |
| projeto-viali | `/home/ubuntu/projeto-viali` | 4,9 MB | containers não apareceram no `docker ps` |
| landing-page-ls | `/home/ubuntu/landing-page-ls` | 3,4 MB | `ls-landing` rodando |
| dashboard-lupa | `/home/ubuntu/dashboard-lupa` | poucos MB | dash, streamlit e Caddy rodando |

O código dos projetos é pequeno; o consumo real está em Docker, volumes e logs.

---

## 7. Decisões e limites

- **Cache de mídia do CDF:** teto de **50 GB** (`MEDIA_CACHE_MAX_GB=50`).
- **Folga operacional:** manter pelo menos **30–40 GB livres** para builds Docker, logs, arquivos temporários de transcode e backups.
- **Com o cache em 50 GB:** o disco deve ficar com cerca de **119 GB livres**, considerando os 149 GB livres atuais.
- **Drive:** os proxies 720p devem ficar no Google Drive Pro de 5 TB; cerca de 2 TB de originais + 0,5–1 TB de proxies cabem nos 3 TB livres.
- **Não remover volumes** sem backup.
- **Journal:** limitar a 1 GB para evitar crescimento; a limpeza manual já reduziu de 4,1 GB para 1 GB.
- **Imagens Docker:** há ~4,7 GB recuperáveis em imagens antigas, mas revisar antes de remover para não afetar rollback de outros projetos.
- **Nginx:** patch local com `proxy_buffering off` para `/api/v1/stream/` foi aplicado em `infra/nginx/prod.conf`; falta deploy/reload na VM.

---

## 8. O que falta / pendências

- [ ] Aplicar `MEDIA_CACHE_MAX_GB=50` no `.env.production` da VM.
- [ ] Recriar `web` e `worker` para ler o novo limite de cache.
- [ ] Deployar o patch do Nginx e rodar `nginx -t` + `nginx -s reload`.
- [ ] Coletar CPU e RAM: `nproc`, `free -h`, `lscpu`, `uname -m`.
- [ ] Registrar a versão do Ubuntu: `lsb_release -a`.
- [ ] Medir o egress mensal no console da Oracle.
- [ ] Fazer o benchmark de streaming atual (cache frio vs. quente, seek, mobile).
- [ ] Implementar o pipeline 720p (`TECH-27`).
- [ ] Limitar downloads concorrentes do cache e evitar download duplicado no primeiro play (`TECH-28`).
- [ ] Rodar teste de carga com 5, 10 e 20 sessões simultâneas (`TECH-29`).
- [ ] Revisar imagens Docker antigas antes de removê-las.
- [ ] Configurar `SystemMaxUse=1G` no journald para manter o limite após reboot.
- [ ] Verificar por que os containers do projeto-viali não estão rodando.

---

## 9. Comandos de referência

### Ver disco e maiores consumidores

```bash
df -hT -x tmpfs -x devtmpfs
lsblk -f

sudo du -xh --max-depth=1 \
  --exclude=/proc --exclude=/sys --exclude=/dev --exclude=/run \
  / 2>/dev/null | sort -h | tail -20

sudo du -xh --max-depth=2 /home /opt /srv /var 2>/dev/null | sort -h | tail -30
```

### Docker

```bash
docker system df
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
docker volume ls
du -sh /var/lib/docker/volumes/* 2>/dev/null | sort -h | tail -20
```

### Logs do sistema

```bash
journalctl --disk-usage
sudo journalctl --vacuum-size=1G
```

### Cache do CDF

```bash
cd ~/cdf

grep -q '^MEDIA_CACHE_MAX_GB=' .env.production \
  && sed -i 's/^MEDIA_CACHE_MAX_GB=.*/MEDIA_CACHE_MAX_GB=50/' .env.production \
  || echo 'MEDIA_CACHE_MAX_GB=50' >> .env.production

docker compose --env-file .env.production -f infra/compose.prod.yaml up -d --force-recreate web worker
```

### Nginx

```bash
docker exec cdf-prod-nginx nginx -t
docker exec cdf-prod-nginx nginx -s reload
```

---

## 10. Histórico

- **2026-11-16:** medição inicial: 184 GB totais, 52 GB usados, 133 GB livres; cache de mídia do CDF com 20 GB; limpeza de build cache e journal liberou ~17 GB; disco passou a 36 GB usados e 149 GB livres; definido teto de cache em 50 GB.
