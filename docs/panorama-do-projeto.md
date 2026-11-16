# Panorama completo — Plataforma “Aula” (CDF)

> Levantamento feito a partir do código-fonte, README, `CLAUDE.md`, migrações, testes e histórico Git. O arquivo `docs/panorama-do-projeto.md` não foi consultado.

---

## 1. O que é o projeto

Uma plataforma web privada de cursos em que **o conteúdo continua no Google Drive** e a aplicação é a camada de experiência. O administrador cola o link de uma pasta, o backend lê a estrutura recursivamente e monta:

```text
Curso → Módulos → Aulas → Materiais (vídeo, PDF, áudio, documento, imagem)
```

O aluno autenticado vê apenas os cursos em que está matriculado, assiste às aulas com player próprio, e a plataforma guarda progresso, posição do vídeo, anotações com timestamp, estatísticas, revisões espaçadas e preferências.

Além dos cursos, existe uma **plataforma de questões de concursos** integrada, ainda em branch separada, com taxonomia, banco de provas, resolução de questões e IA para explicações.

**Estado geral:** é um MVP funcional e relativamente maduro. As fases 0 a 8.1 estão concluídas na `main`; a fase 9 (questões + IA) está na branch `feat/questions`; a fase 10 (ingestão de provas em PDF) ainda não foi implementada.

---

## 2. Estado das branches

| Branch                             | Situação                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `main`                             | Em `640840e`, com README e screenshot. Contém fases 0–8 e a fase 8.1 mobile já mergeada.                                                     |
| `feat/questions`                   | Em `84f153f`, 3 commits à frente do ponto de divergência `7f8235d`. Contém schema, models, API, UI, seed, roteador de IA e testes da fase 9. |
| `feat/mobile-responsive`           | Já incorporada à `main` (0 commits à frente).                                                                                                |
| `fix/mobile-collapse-flat-courses` | Já mergeada na `main` via PR #1.                                                                                                             |

Ponto importante: `feat/questions` divergiu **antes** dos últimos ajustes da `main` (README, correções de mobile, `.gitattributes`, sync idempotente). Ela precisa ser reconciliada antes de ir para produção. Há também um `docs/panorama-do-projeto.md` não rastreado no working tree.

---

## 3. Stack

| Camada      | Tecnologias                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Frontend    | Next.js 15.2.1 (Pages Router), React 19, TypeScript strict, Tailwind CSS v4, SWR, cmdk, Lucide                |
| Mídia       | Vídeo HTML5 nativo, `react-pdf` (pdf.js), Web Audio API para volume/Pomodoro                                  |
| Backend     | API Routes, `next-connect`, Zod, bcryptjs, nodemailer                                                         |
| Banco       | PostgreSQL 17 com SQL puro via `pg`, `node-pg-migrate`, extensão `unaccent`, `pgvector` na branch de questões |
| Cache/filas | Redis 7 com `ioredis`, BullMQ                                                                                 |
| Drive       | Service Account + `google-auth-library` + `fetch` nativo                                                      |
| Infra       | Docker Compose, Nginx, Caddy externo, imagens ARM64, Oracle Cloud A1                                          |
| Qualidade   | Jest, Playwright, ESLint, Prettier, Husky, Commitlint, Commitizen                                             |
| IA (branch) | Google Gemini via HTTP, `config/ai-chains.yaml` validado com Zod                                              |

Curiosidade técnica: `@vidstack/react` está no `package.json`, mas o player principal da `main` usa `<video>` nativo (`components/player/VideoPlayer.tsx:161`). O Vidstack não é usado no código atual.

---

## 4. Arquitetura em uma imagem

```text
Navegador
   │ HTTPS
   ▼
Nginx / Caddy
   ├── /             → Next.js (páginas + API)
   ├── /_next/static → cache imutável
   └── /_drive/      → arquivos em cache local (streaming)
                         ▲
Next.js ─────────────────┘ via X-Accel-Redirect
   ├── PostgreSQL 17
   ├── Redis
   │     └── BullMQ → worker separado
   │                    ├── sincronização do Drive
   │                    └── (futuro) IA e PDF
   └── Google Drive API
```

Processo Node e worker são separados. O worker compartilha os mesmos `models/` e é compilado com esbuild para `dist/worker/index.js`.

---

## 5. Fluxos críticos

### 5.1 Autenticação e autorização

- Sessão própria na tabela `sessions`, token aleatório no cookie `session_id`, `httpOnly`, `SameSite=Lax`, `Secure` em produção.
- Expiração de 30 dias renovada a cada uso (_sliding session_) em `infra/controller.ts:24` e `models/session.ts:23`.
- Senhas com bcrypt e proteção contra timing attack em `models/user.ts:104`.
- Sem cadastro público: entrada por **convite** com token de 7 dias e uso único, ou criação por admin.
- Reset de senha com token de 2 horas e envio por nodemailer/Mailcatcher.
- Middlewares `injectAnonymousOrUser` e `canRequest(feature)` no controller.
- Rate-limit de login no Redis: 5 tentativas por 15 minutos, chave combinando IP + e-mail.
- Admin usa features como `create:course`, `create:invite` e `read:course:all`.

Desvios em relação ao que o `CLAUDE.md` previa: a verificação do header `Origin` nas mutações **não está implementada**, e tokens de sessão/convite/reset ficam gravados em texto puro no banco, não como hash.

### 5.2 Sincronização com o Google Drive

- Service Account só de leitura; compartilhamento da pasta com o e-mail da SA.
- Listagem BFS recursiva com paginação de 1000 itens e suporte a Shared Drives (`services/drive/client.ts`).
- A conversão “listagem → árvore” é uma **função pura** em `services/drive/buildTree.ts:146`, testável sem rede/banco.
- Estratégias:
  - `folders`: subpastas do módulo viram aulas.
  - `files`: cada vídeo inicia uma aula; não-vídeos seguintes são anexados.
  - `auto`: escolhe conforme existência de subpastas.
- Ordenação natural por prefixo numérico, normalização de títulos, suporte a atalhos, `files_manifest.json` como dica de duração, e ignora arquivos do player antigo e lixo de sistema.
- Arquivos soltos na raiz viraram um módulo próprio: “Aulas” em curso plano ou “Materiais do curso” em curso misto.
- `worker/jobs/syncCourse.ts` executa o job `syncCourse`:
  - registra `sync_runs`;
  - marca `running`;
  - lê o Drive;
  - constrói a árvore;
  - grava em transação com upsert por `drive_file_id`;
  - faz soft delete do que sumiu;
  - recalcula contadores.
- O sync é idempotente e uma leitura vazia aborta a operação para não desativar tudo (`models/course.ts:219`).
- A pré-visualização da árvore antes de importar existe em `/api/v1/admin/courses/preview`.

O que está previsto mas não implementado: **sync incremental** com Changes API, uso de `drive_changes_token`, job scheduler a cada 15 minutos e cache da árvore no Redis. Hoje o sync é completo e sob demanda.

### 5.3 Streaming

- O endpoint `/api/v1/stream/[id]` confere sessão, existência do material, feature/matrícula e admin.
- Em dev (`STREAM_MODE=node`), transmite direto do Drive repassando `Range`, e dispara cache em disco em background.
- Em produção (`STREAM_MODE=nginx`), responde com `X-Accel-Redirect` para o Nginx servir o arquivo já cacheado no volume local.
- Cache LRU em disco com teto padrão de 25 GB e limpeza até 80% (`services/drive/mediaCache.ts:27`).
- Suporte a HTTP 206, PDF inline, áudio e retomada de posição.
- A configuração de produção atual usa `alias /var/cache/media/` no Nginx, não proxy direto para o Google. Por isso o header `X-Drive-Token` definido no handler virou um placeholder sem uso real no Nginx de produção.

### 5.4 Progresso, anotações e engajamento

- Heartbeat de 15 s no player e `navigator.sendBeacon` em `/api/v1/progress/batch` ao fechar a aba.
- Gravação **direta no PostgreSQL**, não no buffer Redis com flush posterior previsto no `CLAUDE.md`.
- Conclusão automática ao atingir 90% assistido (`PROGRESS_COMPLETE_RATIO`).
- Notas com timestamp clicável, marcação de importante, edição/exclusão e caderno exportável em Markdown.
- Preferências do player em `user_preferences` + `localStorage`.
- Revisão espaçada 1d/7d/30d ao concluir material (`models/review.ts`).
- `study_days` alimenta streak e heatmap estilo GitHub.
- Busca full-text com `unaccent` em cursos, aulas, notas.
- Pomodoro, modo foco, paleta `Ctrl+K`, mini-player global, atalhos de teclado, PWA com service worker sem cachear vídeos.
- Estatísticas calculadas via SQL em `models/stats.ts`.

### 5.5 Questões + IA (branch `feat/questions`)

Implementado:

- Migração `8_create-questions-schema.ts` com `pgvector` e 14 tabelas:
  `subjects`, `topics`, `boards`, `exams`, `support_texts`, `questions`, `alternatives`, `question_topics`, `explanations`, `answers`, `daily_goals`, `lesson_topics`, `ai_jobs` e estruturas auxiliares.
- Migração `9_add-course-to-questions.ts` adicionando vínculo opcional de questões e disciplinas a cursos.
- Models `Subject`, `Topic`, `Board`, `Exam`, `Question`, `DailyGoal`.
- Roteador de IA em `services/ai/router.ts`:
  - cadeias `deep`, `bulk`, `fast`, `vision` em YAML;
  - validação Zod;
  - token bucket no Redis por RPM/RPD/TPM;
  - circuit breaker de 5 min para 500/503;
  - bloqueio diário em 429 de cota;
  - fallback entre modelos;
  - mock automático em testes sem `GEMINI_API_KEY`.
- API: `GET/POST /questions`, `GET /questions/[id]`, `POST /questions/[id]/answers`, `GET /subjects`, `GET/POST /me/daily-goals`.
- UI `/questions` com filtros, meta diária, alternativas riscáveis, “chutei”, feedback imediato e explicação em Markdown.
- Seed com disciplinas, tópicos, bancas e questões oficiais de exemplo.
- Testes de integração da API e unidade do roteador de IA.

Ainda não implementado nessa branch:

- Ingestão de provas PDF com Docling.
- Parser determinístico por banca.
- Extração de gabarito e cruzamento automático.
- Embeddings/deduplicação com pgvector.
- Fila `pdf`/`ai` no worker.
- Geração assíncrona de explicações em segundo plano.
- Revisão de erros com FSRS.
- Simulados, relatório do coach, painel de desempenho e vínculo aula↔questão na UI.
- A explicação da IA hoje é gerada de forma síncrona na primeira resposta, se houver chave configurada.

---

## 6. Modelo de dados

### Núcleo de cursos — 15 tabelas

| Grupo       | Tabelas                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| Contas      | `users`, `sessions`, `invites`, `password_resets`                        |
| Cursos      | `courses`, `modules`, `lessons`, `materials`, `enrollments`, `sync_runs` |
| Aprendizado | `progress`, `notes`, `user_preferences`                                  |
| Engajamento | `study_days`, `reviews`                                                  |

Características:

- PKs UUID.
- `created_at`/`updated_at` em todas.
- Soft delete por `is_active` em módulos, aulas e materiais.
- `drive_file_id` único em materiais.
- Enums via `text` + `CHECK`.
- Índices por posição, usuário, curso e datas.
- Contadores desnormalizados no curso (`total_duration_seconds`, `materials_count`).

### Questões — 14 tabelas adicionais

`subjects`, `topics`, `boards`, `exams`, `support_texts`, `questions`, `alternatives`, `question_topics`, `explanations`, `answers`, `daily_goals`, `lesson_topics`, `ai_jobs`, além dos índices e constraints.

O `questions.embedding` é `vector(768)` com `pgvector`, já preparado para busca semântica e deduplicação.

---

## 7. Superfície da API

A `main` tem 33 arquivos de rota em `pages/api/v1`; a branch de questões chega a 38.

| Área                       | Rotas principais                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Sistema                    | `GET /status`                                                                              |
| Sessão                     | `POST/DELETE /sessions`, `GET /user`, `PATCH /user/password`                               |
| Convites                   | `GET/PATCH /invites/[token]`                                                               |
| Senha                      | `POST /password-resets`, `PATCH /password-resets/[token]`                                  |
| Cursos                     | `GET /courses`, `GET /courses/[slug]`                                                      |
| Materiais                  | `GET /materials/[id]`, `GET /stream/[id]`                                                  |
| Progresso                  | `GET/PUT /progress/[materialId]`, `POST /progress/batch`                                   |
| Notas                      | `GET/POST /notes`, `PATCH/DELETE /notes/[id]`                                              |
| Busca                      | `GET /search`                                                                              |
| Estatísticas               | `GET /me/stats`, `GET /me/reviews`, `PATCH /me/preferences`                                |
| Revisões                   | `GET /me/reviews`, `POST /me/reviews/[id]/complete`                                        |
| Admin de cursos            | CRUD, `preview`, `sync`, `publish`, `enrollments`, `enroll-all`                            |
| Admin de usuários/convites | `GET/POST /admin/users`, `GET/POST/DELETE /admin/invites`, `/admin/enrollments`            |
| Questões (branch)          | `/subjects`, `/questions`, `/questions/[id]`, `/questions/[id]/answers`, `/me/daily-goals` |

Formato de erro padronizado: `{ name, message, action, status_code }`, com mensagens em PT-BR.

---

## 8. Funcionalidades por persona

### Aluno

- Login por convite e acesso somente aos cursos matriculados.
- Dashboard com “continuar de onde parou”, streak, heatmap, revisões do dia e cursos em andamento.
- Player com seek, velocidade, teatro, fullscreen, atalhos, volume até 200%, autoplay e mini-player global.
- Modo áudio, PDF inline com última página, documentos.
- Progresso no servidor, anotações com timestamp, caderno exportável.
- Pomodoro, modo foco, busca global e PWA.
- Resolução de questões com filtros, meta diária, feedback e explicação por IA (branch).

### Administrador

- Cadastro de curso pelo link da pasta.
- Pré-visualização da árvore antes de importar.
- Sincronização manual ou via fila, com status e histórico em `sync_runs`.
- Gestão de cursos, publicação, matrículas, convites e usuários.
- Distribuição de cursos para todos os alunos.
- Toggle de acesso por curso no painel de convites.

---

## 9. Testes e qualidade

- **17 suítes Jest** na `main`: 14 de integração de API, 2 de páginas e 1 unidade (`buildTree`).
- **53 testes** documentados como verdes no estado atual.
- **9 cenários E2E Playwright**: 5 desktop + 4 mobile.
- CI no GitHub Actions roda ESLint, Prettier e Jest em push/PR para `main`.
- Orquestrador de testes sobe serviços, espera banco, limpa dados, roda migrações e cria fixtures.
- Drive e Gemini são mockados nos testes.

Pontos de atenção verificados:

- `node node_modules/typescript/bin/tsc --noEmit` atualmente reporta **4 erros** em testes de integração (`tree` possivelmente `null`): notas, progresso, revisões e busca.
- Os binários em `node_modules/.bin` estão sem permissão de execução neste ambiente (`jest`/`tsc` via `npx` falham com “Permission denied”); rodando via `node ...` funciona.
- A cobertura de testes é boa no fluxo principal, mas várias rotas administrativas e casos de erro ainda não têm teste dedicado.

---

## 10. Infraestrutura e deploy

- `Dockerfile` multi-stage com Next.js standalone, worker compilado por esbuild e usuário não-root.
- `infra/compose.yaml` de desenvolvimento: PostgreSQL com pgvector, Redis, Mailcatcher e Docling opcional via profile `pdf`.
- `infra/compose.prod.yaml`: `db`, `redis`, `migrate`, `web`, `worker`, `nginx`, rede interna e volume compartilhado de mídia.
- Nginx com gzip, headers de segurança, cache de `/_next/static`, rate-limit em `/api/v1/sessions` e location interna `/_drive/`.
- `deploy.sh`: git pull, build, migrações em container isolado, subida de web/worker/nginx e healthcheck em `/api/v1/status`.
- Backup diário do Postgres com retenção de 7 dias.
- Integração com proxy Caddy externo na rede `web`.
- Imagens e volumes preparados para ARM64/Oracle A1.

Pendências operacionais já mapeadas no próprio repositório: nome definitivo, domínio, SMTP de produção, Sentry, taxonomia inicial de disciplinas/bancas e definição se o produto será fechado ou comercial.

---

## 11. Principais pontos fortes

1. **Proposta clara e bem resolvida:** resolve a dor real de assistir cursos do Drive com progresso, notas e controle de acesso sem migrar arquivos.
2. **Função pura `buildTree`:** a regra mais complexa do domínio é testável isoladamente.
3. **Sync idempotente com soft delete:** evita perda de progresso e notas.
4. **Streaming com Range Requests e cache local:** experiência de seek muito superior ao player do Drive.
5. **Autenticação e autorização coerentes:** sessão própria, convites, features e matrícula.
6. **Boa separação de camadas:** `pages/api` → `models` → `infra`, com Zod na entrada.
7. **Documentação didática:** `CLAUDE.md` e `docs/learning/` explicam decisões e conceitos.
8. **Base pronta para IA:** schema de questões, roteador de cotas e fallback já desenhados.

---

## 12. Lacunas, riscos e dívidas técnicas

1. **Branch de questões não integrada:** é um fork grande e divergente; precisa de rebase/merge cuidadoso com a `main`.
2. **Documentação à frente do código em vários pontos:**
   - sync incremental e Changes API não existem;
   - cache de árvore no Redis não existe;
   - buffer Redis de progresso + flush não existe;
   - verificação de `Origin`/CSRF não existe;
   - tokens não são armazenados como hash;
   - `/status` não checa Redis, fila ou Docling;
   - Vidstack está instalado mas não é usado;
   - Docling, FSRS, simulados, coach e embeddings ainda não foram implementados.
3. **Typecheck atual falha em 4 arquivos de teste** com `tree` possivelmente `null`.
4. **Segurança a endurecer:** tokens em texto puro no banco, ausência de checagem de `Origin`, rate-limit combinado IP+e-mail em vez de buckets separados, dependência apenas de `SameSite` para CSRF.
5. **Streaming em produção depende do volume de cache e do Nginx**; o primeiro acesso ainda busca no Drive. O header `X-Drive-Token` é um placeholder.
6. **Sync completo é caro** para pastas grandes; a ausência de incremental limita escala.
7. **IA ainda é síncrona no primeiro acesso** e não há worker de IA/PDF; a geração de explicações pode aumentar a latência da resposta e competir com a cota.
8. **Pequeno bug potencial na branch de questões:** `/questions` busca `/api/v1/courses?public=true`, mas a rota de cursos exige autenticação e ignora o parâmetro `public`.
9. **Cobertura insuficiente de testes em rotas administrativas e cenários de erro.**

---

## 13. Como rodar

Requisitos: Node 24 e Docker.

```bash
npm install
npm run dev        # sobe Postgres, Redis, Mailcatcher, migra e inicia o Next
npm run seed       # admin e curso de exemplo com dados falsos
npm run worker:dev # worker BullMQ de sincronização
npm test           # integração + unidade via Jest
npm run test:e2e   # Playwright
```

Aplicação em `http://localhost:3000`; e-mails em `http://localhost:1080`.

Credenciais de seed: `admin@aula.local` / `admin123456`.

Para importar cursos reais, é necessário configurar uma Service Account do Google Cloud, habilitar a Drive API e compartilhar a pasta com o e-mail da SA como leitora.

---

## 14. Conclusão

O projeto é um **produto full stack consistente**, com uma arquitetura coerente com o curso.dev, boa separação de responsabilidades e um fluxo principal realmente funcional: Drive → árvore → player → progresso → notas → engajamento.

O maior valor está na combinação de **streaming seguro com cache local**, **sincronização idempotente** e **experiência de estudo** (progresso, notas, revisões, heatmap). A plataforma de questões é a expansão mais ambiciosa e já tem a fundação de dados, API, UI e roteamento de IA, mas ainda está em branch separada e falta a parte mais pesada: ingestão de provas, processamento assíncrono, deduplicação, revisão de erros e analytics.

Antes de produção, os pontos mais urgentes são: reconciliar `feat/questions`, corrigir os 4 erros de typecheck, fechar as lacunas de segurança (tokens/CSRF), validar o comportamento do streaming no ambiente real e alinhar a documentação ao que de fato está implementado.
