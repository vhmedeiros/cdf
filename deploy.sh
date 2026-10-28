#!/bin/bash
# ─── Script de Deploy Automatizado (CDF / Aula) ────────────────────────────────
set -euo pipefail

echo "🚀 ==================================================="
echo "🚀 Iniciando Deploy em Produção — Plataforma Aula (CDF)"
echo "🚀 ==================================================="

# 1. Validação de pré-requisitos
if [ ! -f .env.production ]; then
  echo "❌ Arquivo .env.production não encontrado!"
  echo "👉 Crie o arquivo .env.production baseado em .env.example antes de rodar o deploy."
  exit 1
fi

COMPOSE="docker compose --env-file .env.production -f infra/compose.prod.yaml"

# 2. Atualiza o código do repositório
echo "📥 1/6 Atualizando código via Git..."
git pull origin main

# 3. Constrói as imagens locais (ARM64 nativo na VM)
echo "🔨 2/6 Construindo imagens Docker da aplicação..."
${COMPOSE} build

# 4. Sobe serviços de banco e cache e aguarda ficarem saudáveis
echo "🗄️  3/6 Iniciando serviços de infraestrutura (PostgreSQL e Redis)..."
${COMPOSE} up -d db redis

DB_USER=$(grep -E '^POSTGRES_USER=' .env.production | cut -d '=' -f2- | tr -d ' "\r' || echo "cdf_prod_user")
DB_NAME=$(grep -E '^POSTGRES_DB=' .env.production | cut -d '=' -f2- | tr -d ' "\r' || echo "cdf_production")

echo "⏳ Aguardando banco de dados ficar saudável..."
until ${COMPOSE} exec -T db pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; do
  sleep 2
done
echo "✅ Banco de dados pronto e operacional."

# 5. Executa as migrações em container isolado
echo "🔄 4/6 Executando migrações de banco de dados..."
${COMPOSE} run --rm migrate
echo "✅ Migrações aplicadas com sucesso."

# 6. Sobe web, worker e nginx com renovação do Nginx
echo "🚢 5/6 Inicializando aplicação Web, Worker BullMQ e Nginx..."
${COMPOSE} up -d --remove-orphans web worker
${COMPOSE} up -d --force-recreate nginx

# 7. Verificação de Saúde (Healthcheck)
echo "🩺 6/6 Verificando status da aplicação..."
sleep 5

MAX_RETRIES=10
COUNT=0
HEALTHY=false

while [ $COUNT -lt $MAX_RETRIES ]; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3005/api/v1/status || echo "000")
  if [ "$HTTP_STATUS" = "200" ]; then
    HEALTHY=true
    break
  fi
  echo "Aguardando resposta 200 do /api/v1/status... (tentativa $((COUNT + 1))/$MAX_RETRIES)"
  sleep 3
  COUNT=$((COUNT + 1))
done

if [ "$HEALTHY" = true ]; then
  echo "🎉 ==================================================="
  echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
  echo "🎉 O serviço está rodando em http://127.0.0.1:3005"
  echo "🎉 ==================================================="
else
  echo "⚠️  Aviso: Não foi possível verificar o /api/v1/status imediatamente. Verifique com: docker compose -f infra/compose.prod.yaml logs web"
fi

# 8. Limpeza de imagens antigas não utilizadas
docker image prune -f > /dev/null 2>&1 || true
