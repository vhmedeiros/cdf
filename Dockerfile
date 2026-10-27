# ─── Stage 1: Base ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ─── Stage 2: Dependencies ─────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 3: Builder ──────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 1. Build Next.js standalone
RUN npm run build

# 2. Build worker bundle
RUN npm run worker:build

# ─── Stage 4: Production Runner ────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Arquivos públicos e assets estáticos
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Worker compilado
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# Infraestrutura e migrações
COPY --from=builder --chown=nextjs:nodejs /app/infra ./infra
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Diretório de cache de mídia para streaming acelerado
RUN mkdir -p /app/.cache/media && chown -R nextjs:nodejs /app/.cache

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
