#!/usr/bin/env bash
set -euo pipefail

trap 'echo "FALHOU na linha $LINENO (comando: $BASH_COMMAND)" >&2' ERR

echo "Iniciando validação de streaming..."

# Valida TECH-06: streaming real com cache, Range 206 e sem vazamento de token.
#
# Uso (na VM, dentro de ~/cdf):
#   CDF_EMAIL=voce@exemplo.com CDF_PASSWORD='sua-senha' \
#     ./infra/scripts/validate-streaming.sh
#
# O script descobre sozinho:
#   - BASE_URL a partir de WEBSERVER_ORIGIN no .env.production;
#   - MATERIAL_ID: o vídeo ativo mais recente no banco (via docker).

BASE_URL="${BASE_URL:-}"
: "${CDF_EMAIL:?Defina CDF_EMAIL com um usuário matriculado}"
: "${CDF_PASSWORD:?Defina CDF_PASSWORD com a senha de login}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ -z "$BASE_URL" ] && [ -f "$REPO_ROOT/.env.production" ]; then
  BASE_URL="$(
    grep -E '^[[:space:]]*WEBSERVER_ORIGIN=' "$REPO_ROOT/.env.production" \
      | head -n1 \
      | cut -d= -f2- \
      | tr -d '[:space:]"'
  )"
fi
BASE_URL="${BASE_URL:-http://127.0.0.1:3005}"

if [ -z "${MATERIAL_ID:-}" ] && command -v docker > /dev/null 2>&1; then
  echo "→ MATERIAL_ID não informado; buscando o vídeo ativo mais recente no banco..."
  detected_material_id="$(
    docker exec cdf-prod-db sh -lc \
      "psql -U \$POSTGRES_USER -d \$POSTGRES_DB -tAc \"SELECT id FROM materials WHERE kind = 'video' AND is_active ORDER BY created_at DESC LIMIT 1;\"" \
      2>/dev/null | tr -d '[:space:]' || true
  )"
  if [ -n "$detected_material_id" ]; then
    MATERIAL_ID="$detected_material_id"
  fi
fi
: "${MATERIAL_ID:?Defina MATERIAL_ID com o UUID de um material de vídeo}"

echo "→ BASE_URL: $BASE_URL"
echo "→ MATERIAL_ID: $MATERIAL_ID"

COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

fail() {
  echo "FALHOU: $1" >&2
  exit 1
}

pass() {
  echo "OK: $1"
}

echo "→ Login em $BASE_URL"
curl -fsS --connect-timeout 10 --max-time 60 -c "$COOKIE_JAR" -H "Content-Type: application/json" \
  -d "{\"email\":\"${CDF_EMAIL}\",\"password\":\"${CDF_PASSWORD}\"}" \
  "$BASE_URL/api/v1/sessions" > /dev/null || fail "login"

echo "→ Range frio (bytes=0-1023)"
cold_headers="$(
  curl -sS --connect-timeout 10 --max-time 120 -D - -o /dev/null -b "$COOKIE_JAR" \
    -H "Range: bytes=0-1023" \
    "$BASE_URL/api/v1/stream/${MATERIAL_ID}"
)"
grep -q " 206 " <<< "$cold_headers" || fail "range frio não retornou 206"
grep -qi "content-range: bytes 0-1023/" <<< "$cold_headers" || fail "Content-Range frio ausente"
grep -qi "accept-ranges: bytes" <<< "$cold_headers" || fail "Accept-Ranges frio ausente"
if grep -qi "x-drive-token" <<< "$cold_headers"; then
  fail "token do Drive vazou"
fi
pass "range frio com 206 e sem token"

echo "→ Range quente (mesmo arquivo, agora no cache)"
warm_headers="$(
  curl -sS --connect-timeout 10 --max-time 120 -D - -o /dev/null -b "$COOKIE_JAR" \
    -H "Range: bytes=0-1023" \
    "$BASE_URL/api/v1/stream/${MATERIAL_ID}"
)"
grep -q " 206 " <<< "$warm_headers" || fail "range quente não retornou 206"
grep -qi "content-range: bytes 0-1023/" <<< "$warm_headers" || fail "Content-Range quente ausente"
pass "range quente com 206"

echo "→ Requisição completa (sem Range)"
full_headers="$(
  curl -sS --connect-timeout 10 --max-time 120 -D - -o /dev/null -b "$COOKIE_JAR" "$BASE_URL/api/v1/stream/${MATERIAL_ID}"
)"
grep -q " 200 " <<< "$full_headers" || fail "requisição sem Range não retornou 200"
grep -qi "accept-ranges: bytes" <<< "$full_headers" || fail "Accept-Ranges ausente no 200"
pass "requisição completa com 200"

echo "→ Range inválido deve retornar 416"
invalid_headers="$(
  curl -sS --connect-timeout 10 --max-time 120 -D - -o /dev/null -b "$COOKIE_JAR" \
    -H "Range: bytes=999999999999-" \
    "$BASE_URL/api/v1/stream/${MATERIAL_ID}"
)"
grep -q " 416 " <<< "$invalid_headers" || fail "range inválido não retornou 416"
grep -qi "content-range: bytes \\*/" <<< "$invalid_headers" || fail "Content-Range 416 ausente"
pass "range inválido com 416"

echo "→ Tamanho do cache"
if command -v docker > /dev/null 2>&1; then
  docker exec cdf-prod-web du -sh /app/.cache/media 2>/dev/null || true
else
  echo "docker não encontrado; verifique o volume cdf_prod_media manualmente."
fi

echo "TECH-06: streaming validado com sucesso."
