#!/bin/bash
# ─── Script de Backup Diário do PostgreSQL (CDF / Aula) ────────────────────────
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/cdf}"
CONTAINER_NAME="${DB_CONTAINER:-cdf-prod-db}"
DATE_STR=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/cdf_backup_${DATE_STR}.sql.gz"

echo "📦 [$(date)] Iniciando backup do banco PostgreSQL..."

# Garante existência do diretório de backup
mkdir -p "${BACKUP_DIR}"

# Executa pg_dump dentro do container e compacta via gzip
docker exec -t "${CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER:-cdf_prod_user}" "${POSTGRES_DB:-cdf_production}" | gzip -c > "${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ [$(date)] Backup concluído com sucesso: ${BACKUP_FILE} (${FILESIZE})"

# Limpeza e Retenção:
# 1. Mantém os 7 backups mais recentes
echo "🧹 Limpando backups antigos (retenção de 7 dias)..."
ls -t "${BACKUP_DIR}"/cdf_backup_*.sql.gz | tail -n +8 | xargs -r rm -f

echo "🎉 Rotina de backup finalizada com sucesso."
