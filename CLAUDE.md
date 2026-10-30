# CLAUDE.md — Plataforma de Cursos "Aula" (nome provisório)

> Este arquivo é a fonte de verdade do projeto para qualquer agente (Claude, Gemini ou outro) trabalhando no Antigravity.
> Leia **inteiro** antes de qualquer tarefa. Ao terminar uma fase, atualize a seção **Estado atual** no final.

> **Contexto de aprendizado:** o dono está fazendo o curso.dev (Filipe Deschamps), que constrói um clone do TabNews com **Next.js + Node.js + PostgreSQL**. Este projeto usa **as mesmas convenções do curso** (estrutura de pastas, SQL puro com `pg`, migrações com `node-pg-migrate`, testes de integração com Jest contra o servidor rodando, sessão em tabela própria, autorização por _features_), com **TypeScript** por cima. Quando houver dúvida de "como fazer", prefira o jeito do curso e explique a escolha em linguagem didática. O dono quer **entender** o código, não só recebê-lo.

---

## 1. Visão do produto

Plataforma web privada de cursos em que **o conteúdo mora no Google Drive** e a plataforma é a camada de experiência:

1. O admin cadastra um curso com **nome**, **descrição** e **link da pasta no Google Drive**.
2. O backend lê a pasta (recursivamente) e monta a árvore **Curso → Módulos → Aulas → Materiais** (vídeo, PDF, áudio, etc.).
3. Usuários autenticados (login e senha) veem apenas os cursos em que estão matriculados, assistem às aulas no player, e a plataforma guarda **progresso, posição do vídeo, anotações com timestamp e histórico de estudo**.
4. Junto, uma **plataforma de questões de concursos** integrada às aulas, com IA (§12).

### Referência visual e funcional (descrita aqui; os arquivos **não** estão no repositório)

O dono tinha um player estático gerado por curso. **Não procure esses arquivos no repositório**: a descrição abaixo é tudo de que o agente precisa. Ele tinha:

- sidebar com árvore módulo → aula → arquivos, expandir/recolher tudo, progresso por módulo/aula;
- player com autoplay da próxima aula, vídeo flutuante ao rolar, botão de nota rápida sobre o vídeo;
- anotações por vídeo com timestamp clicável, marcação de "importante", edição/exclusão com modal;
- Pomodoro com círculo animado, som e configuração;
- barra de estatísticas e de progresso geral;
- tema escuro preto + dourado (`#d4af37` e `#f5d76e`).

O novo sistema **mantém essas funcionalidades e a herança visual dourada**, mas é multi-curso, multi-usuário, com dados no servidor (não em `localStorage`), responsivo, e com experiência mais moderna (ver §7 e §8).

### Pastas do Drive com ou sem os arquivos do player antigo

**Alguns cursos no Drive trazem os arquivos do player antigo e outros não.** O sistema **nunca depende deles**:

- **Ignorar sempre** como material: `index.html`, `script.js`, `style.css`, `files_manifest.json` e a pasta que os contém, quando ela só tiver esses arquivos.
- **Se existir `files_manifest.json`**, usá-lo apenas como **dica opcional** (ordem e duração dos vídeos) para enriquecer o resultado da leitura da pasta. A estrutura real vem sempre da listagem do Drive.
- Formato de referência do manifest, para quem escrever o leitor de dicas:

```json
{
  "name": "...",
  "modules": [
    {
      "name": "001. Raio-X Estrategico",
      "lessons": [
        {
          "name": "Conteúdo",
          "files": [
            {
              "id": "...",
              "name": "001. Aula.mp4",
              "path": "../001. Raio-X Estrategico/001. Aula.mp4",
              "mime": "video/mp4",
              "kind": "video",
              "duration": 603.349
            }
          ],
          "lessons": []
        }
      ]
    }
  ]
}
```

---

## 2. Decisões de arquitetura (não mudar sem registrar ADR em `docs/decisions.md`)

| Área                      | Decisão                                                                                                                                                                                                         | Por quê                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Linguagem                 | **TypeScript** (`strict: true`) no projeto inteiro. Node **24** (`.nvmrc` e `engines`, como no curso)                                                                                                           | Uma linguagem só, de ponta a ponta. O curso usa JS: ao seguir um exemplo do curso, traduzir para TS e explicar o tipo adicionado |
| App web                   | **Next.js** com **Pages Router**: telas em `pages/` e API em `pages/api/v1/`                                                                                                                                    | É o que o curso usa. Seguir o curso evita "brigar" com as aulas. Migrar para App Router só via ADR                               |
| Rotas da API              | **next-connect** com `infra/controller.ts` (tratamento de erro central, `injectAnonymousOrUser`, `canRequest(feature)`)                                                                                         | Padrão do curso                                                                                                                  |
| Banco                     | **PostgreSQL 17** com **SQL puro** via `pg` (`infra/database.ts`). Migrações com **node-pg-migrate** em `infra/migrations/`                                                                                     | Padrão do curso, e ensina SQL de verdade. Tipos das linhas escritos à mão em `models/*.ts`, validados com **zod** na entrada     |
| Validação                 | **zod** em toda entrada de API e em toda saída de IA                                                                                                                                                            | Uma fonte para tipo e validação                                                                                                  |
| Busca semântica           | **pgvector** (imagem `pgvector/pgvector:pg17`, confirmar arm64) + pacote npm `pgvector`                                                                                                                         | Similaridade questão↔aula e deduplicação sem banco extra                                                                        |
| Cache e filas             | **Redis 7** (ou Valkey)                                                                                                                                                                                         | Cache da árvore do curso, token do Drive, buffer de progresso, rate-limit, filas                                                 |
| Jobs assíncronos          | **BullMQ** em um processo **worker** separado (`worker/`, mesmo repositório, mesmos `models/`). Agendamentos com _job schedulers_ do BullMQ                                                                     | Substitui o Celery. **É necessário**: a sincronização com o Drive e a IA são lentas e periódicas                                 |
| UI                        | **Tailwind CSS v4** + **shadcn/ui** (sobre Radix) + **lucide-react** + **cmdk** (paleta `Ctrl+K`)                                                                                                               | Componentes acessíveis e editáveis, sem visual genérico imposto                                                                  |
| Dados no cliente          | **SWR** (usado no curso)                                                                                                                                                                                        | Cache, revalidação e refetch simples                                                                                             |
| Player                    | **Vidstack** (`@vidstack/react`), com Plyr como alternativa se houver problema                                                                                                                                  | Range requests, velocidade, PiP, atalhos, legendas                                                                               |
| PDF                       | **react-pdf** (pdf.js)                                                                                                                                                                                          | Ler PDF inline lembrando a página                                                                                                |
| Leitura de PDF das provas | **Docling** (Python, MIT, suporta arm64/CPU) como **serviço HTTP separado** (`docling-serve`). Única peça em Python; o Node só chama a API dele. **Marker** fica como alternativa a avaliar no teste da fase 10 | Converte o PDF em Markdown/JSON localmente, sem gastar cota de IA. Ver §12.3                                                     |
| IA                        | **Google Gemini API** (plano gratuito no início) via SDK `@google/genai`, sempre atrás de `services/ai/` com o **roteador de cota**                                                                             | Ver §12.4                                                                                                                        |
| Proxy                     | **Nginx** com certbot para o TLS                                                                                                                                                                                | Necessário pelo `X-Accel-Redirect` do streaming do Drive (§5.5)                                                                  |
| Runtime                   | **Docker Compose**, imagens **arm64**. Next com `output: "standalone"`                                                                                                                                          | A VM Oracle A1 é **ARM (aarch64)**                                                                                               |
| Qualidade                 | ESLint + Prettier, **husky + commitlint + commitizen** (Conventional Commits, como no curso); **Jest** para testes de integração e unidade; **Playwright** para e2e                                             | Padrão do curso, mais o e2e                                                                                                      |

### Autenticação (no estilo do curso)

- **Sessão própria em tabela `sessions`**: token aleatório no cookie `session_id` (`httpOnly`, `secure` em produção, `sameSite: "lax"`), com expiração renovada a cada uso. Nada de JWT em `localStorage`.
- Login por **e-mail + senha**. Hash com **bcryptjs**, como no curso; Argon2 pode ser considerado via ADR.
- **Sem cadastro público**: usuários entram por **convite** (link com token de uso único e expiração, no mesmo modelo dos `activation tokens` do curso) ou são criados por um admin.
- Mutações (`POST/PATCH/PUT/DELETE`) verificam o header `Origin` contra o domínio, uma defesa extra contra CSRF além do `sameSite`.
- Força bruta: rate-limit por IP e por e-mail no Redis em `POST /api/v1/sessions` (5 erros → bloqueio progressivo), mais `limit_req` no Nginx.
- E-mail via **nodemailer**. Em desenvolvimento, **mailcatcher** no compose (como no curso).
- Opcional na fase 8: 2FA TOTP.

### Autorização por _features_ (padrão do curso)

- Cada usuário tem `features: string[]` (ex.: `read:course`, `create:note`, `create:course`, `update:enrollment:others`).
- Os papéis são conjuntos de features: **student** (assistir, anotar, responder) e **admin** (gerenciar cursos, usuários, matrículas, provas, IA).
- Toda rota usa `canRequest("feature")`. Toda rota de conteúdo verifica **também a matrícula** (`Enrollment` ativo e não expirado).

---

## 3. Estrutura do repositório (espelha o curso)

```
.
├── CLAUDE.md                   # este arquivo
├── AGENTS.md / GEMINI.md       # só dizem: "Siga integralmente o CLAUDE.md"
├── docs/
│   ├── decisions.md            # ADRs curtos (data, decisão, motivo)
│   └── drive-setup.md          # passo a passo da Service Account
├── infra/
│   ├── compose.yaml            # serviços de dev: postgres, redis, mailcatcher, docling (profile)
│   ├── compose.prod.yaml       # produção na A1
│   ├── database.ts             # pool do pg + helper query()
│   ├── migrations/             # node-pg-migrate
│   ├── controller.ts           # next-connect: erros, sessão, canRequest
│   ├── errors.ts               # ValidationError, NotFoundError, UnauthorizedError, ForbiddenError...
│   ├── redis.ts  queue.ts      # conexão Redis e filas BullMQ
│   ├── email.ts  webserver.ts
│   ├── nginx/                  # nginx.conf, site.conf
│   └── scripts/                # wait-for-postgres.ts, backup.sh, deploy.sh
├── models/                     # regra de negócio + SQL (user, session, authorization, course, lesson,
│                               #  material, enrollment, progress, note, question, answer, goal...)
├── services/
│   ├── drive/                  # cliente do Drive, leitor de pasta, sync, streaming
│   ├── ai/                     # roteador de IA, prompts versionados, cota (§12.4)
│   └── pdfparse/               # cliente do docling-serve + parsers por banca (§12.3)
├── worker/
│   ├── index.ts                # processo BullMQ (filas: drive, ai, pdf, maintenance)
│   └── jobs/                   # syncCourse, flushProgress, extractExam, generateExplanations...
├── pages/
│   ├── api/v1/                 # rotas da API
│   └── ...                     # telas
├── components/                 # ui/ (shadcn), player/, course/, notes/, questions/, focus/
├── hooks/                      # usePlayer, useProgress, useShortcuts, usePomodoro...
├── styles/                     # tokens.css, globals.css
├── i18n/pt-BR.ts               # textos da interface
├── tests/
│   ├── orchestrator.ts         # espera serviços, limpa banco, roda migrações, cria dados (faker)
│   ├── integration/api/v1/...  # um arquivo por rota e método (get.test.ts, post.test.ts)
│   ├── unit/
│   └── e2e/                    # Playwright
├── Dockerfile  Dockerfile.worker
├── .env.development            # valores de DEV sem segredo (como no curso)
├── .env.example                # lista de variáveis de produção, sem valores
└── package.json                # scripts: dev, test, services:*, migrations:*, lint:*, worker:dev
```

Idioma: **código, nomes, commits e comentários em inglês**; **textos da interface em português do Brasil** (centralizados em `i18n/pt-BR.ts`).

---

## 4. Modelo de dados (PostgreSQL, tabelas em `snake_case` no plural)

Todas as PKs como **UUID** (`gen_random_uuid()`). Colunas `created_at`/`updated_at` (`timestamptz`, em UTC) em todas as tabelas.

```
users                     email (único, login), password (hash), display_name, avatar_url,
                          features text[], preferences jsonb (tema, velocidade, autoplay, pomodoro)
sessions                  token (único), user_id, expires_at
invites                   email, token (hash), features text[], course_ids uuid[], expires_at, used_at, created_by

courses                   title, slug, description (markdown), drive_url, drive_folder_id,
                          cover_url (opcional; senão gradiente gerado), accent_color (opcional),
                          status[draft|published|archived], lesson_strategy[auto|folders|files],
                          sync_status[idle|queued|running|ok|error], sync_error, last_synced_at,
                          drive_changes_token, total_duration_seconds, materials_count
modules                   course_id, drive_folder_id, raw_name, title, position, is_active
lessons                   module_id, drive_folder_id (null se agrupada por arquivo), raw_name,
                          title, position, is_active, duration_seconds
materials                 lesson_id, drive_file_id (único), raw_name, title,
                          kind[video|audio|pdf|doc|image|link|other], mime, size_bytes,
                          duration_seconds, md5, drive_modified_time, position, is_active
enrollments               user_id, course_id, granted_by, expires_at (null = sem expiração)
                          unique(user_id, course_id)

progress                  user_id, material_id, position_seconds, watched_seconds,
                          completed_at (null), last_seen_at   unique(user_id, material_id)
notes                     user_id, material_id, timestamp_seconds (null p/ notas gerais),
                          body (markdown), is_important, pdf_page (null)
study_days                user_id, date, seconds, materials_completed   unique(user_id, date)
reviews                   user_id, lesson_id, stage[1d|7d|30d], due_date, done_at
sync_runs                 course_id, started_at, finished_at, status, stats jsonb, log text
```

Regras:

- **Soft delete** (`is_active = false`) para itens que somem do Drive. Nunca apagar e perder progresso ou notas. Se o arquivo reaparecer (mesmo `drive_file_id`), reativar.
- Índices: `(course_id, position)`, `(module_id, position)`, `(lesson_id, position)`, `progress(user_id, last_seen_at desc)`, `notes(user_id, material_id)`.
- `courses.total_duration_seconds` e os contadores são **desnormalizados** e recalculados no fim de cada sync.
- Enums como `text` com `CHECK` (mais simples de migrar que `CREATE TYPE`).

---

## 5. Integração com o Google Drive (o coração do sistema)

### 5.1 Acesso

- Usar uma **Service Account** (Google Cloud → projeto → habilitar Drive API → criar SA → baixar JSON).
- O dono **compartilha a pasta raiz dos cursos com o e-mail da SA (permissão Leitor)**. As pastas **não** devem ser públicas.
- Credencial montada como arquivo secreto no container (`/run/secrets/gdrive_sa.json`), caminho em `GOOGLE_SA_FILE`. Nunca commitar.
- Escopo: `https://www.googleapis.com/auth/drive.readonly`.
- Usar `google-auth-library` para o token e `fetch` nativo para as chamadas, com retry e backoff exponencial em 429/5xx (`async-retry`, já usado no curso). Access token cacheado no Redis (`drive:token`, TTL 50 min).
- Sempre passar `supportsAllDrives=true&includeItemsFromAllDrives=true` (suporte a Drives compartilhados).
- Escrever `docs/drive-setup.md` com o passo a passo para o dono.

### 5.2 Cadastro do curso

- Admin cola o link. Aceitar todos os formatos: `.../drive/folders/<ID>`, `.../drive/u/0/folders/<ID>?usp=sharing`, `...open?id=<ID>`, ou o ID puro.
- Ao salvar: validar que a SA enxerga a pasta. Se não enxergar, mostrar erro claro **com o e-mail da SA para copiar** ("Compartilhe a pasta com: xxx@yyy.iam.gserviceaccount.com").
- Botão **"Pré-visualizar estrutura"**: roda a leitura da pasta sem gravar e mostra a árvore que será criada (módulos, aulas, contagem de vídeos/PDFs, duração total). Só então "Importar".

### 5.3 Convenção de pastas → árvore

```
<Pasta do curso>/
├── 001. Raio-X Estratégico/           → Módulo
│   ├── 001. Aula.mp4                  → (estratégia "files") Aula, com os materiais seguintes anexados
│   ├── 002. Livro-Raio-X.pdf
│   └── 003. Áudio.mp3
├── 002. Aula 00 - Prof. Fulano/       → Módulo
│   ├── 01. Introdução/                → (estratégia "folders") Aula
│   │   ├── 001. Aula.mp4              → Material
│   │   └── 002. Slides.pdf            → Material
│   └── 02. Exercícios/ ...
└── player/ (index.html, script.js, style.css, files_manifest.json)   → IGNORADO (ver §1)
```

- **Nível 1** de subpastas = **Módulos**.
- **Aulas**, conforme `lesson_strategy`:
  - `folders`: subpastas do módulo = aulas; arquivos soltos no módulo vão para uma aula "Materiais do módulo".
  - `files`: cada **vídeo** inicia uma aula; arquivos não-vídeo seguintes (PDF, áudio) são anexados como materiais dessa aula. Arquivos antes do primeiro vídeo formam a aula "Introdução".
  - `auto` (padrão): `folders` se o módulo tiver subpastas, senão `files`.
- Subpastas mais profundas que o nível de aula: achatar dentro da aula, prefixando o título com o nome da subpasta.
- **Ordenação natural** pelo prefixo numérico (`001.`, `01 -`, `1_`), depois alfabética. O **título exibido remove o prefixo** e normaliza: trocar `_` e `.` usados como separador por espaço quando o nome todo vier "pontuado" (ex.: `Camara.dos.Deputados.Analista...`).
- `kind` derivado do `mimeType`: `video/*` → video, `audio/*` → audio, `application/pdf` → pdf, `application/vnd.google-apps.document|presentation|spreadsheet` → doc (exibir via export PDF ou link), `image/*` → image, atalhos (`application/vnd.google-apps.shortcut`) → resolver `shortcutDetails.targetId`.
- Duração: `videoMediaMetadata.durationMillis` (pedir em `fields`). Se faltar, usar a dica do `files_manifest.json` quando existir; para áudio, preencher no cliente na primeira reprodução e enviar ao backend.
- Campos mínimos na listagem: `files(id,name,mimeType,size,md5Checksum,modifiedTime,videoMediaMetadata,shortcutDetails,parents),nextPageToken`, `pageSize=1000`, paginar sempre.
- A lógica de "listagem do Drive → árvore" é uma **função pura** (`services/drive/buildTree.ts`), sem acesso a rede ou banco, para ser testada com fixtures JSON.

### 5.4 Sincronização (BullMQ, fila `drive`)

- Job `syncCourse({ courseId, dryRun })`: idempotente, faz **upsert por `drive_folder_id`/`drive_file_id`** (`INSERT ... ON CONFLICT`), soft-delete do que sumiu, recalcula contadores, grava em `sync_runs`, invalida o cache `course:{id}:tree`. Tudo numa transação.
- Um sync por curso de cada vez: `jobId` determinístico (`sync:{courseId}`) no BullMQ e lock no Redis.
- **Incremental**: guardar `drive_changes_token` (Changes API `startPageToken`). Um _job scheduler_ a cada 15 min verifica mudanças e só re-sincroniza cursos afetados. Sync completo noturno como rede de segurança.
- Status ao vivo no admin: SWR com `refreshInterval: 2000` em `GET /api/v1/admin/courses/[id]/sync` enquanto estiver `running`.

### 5.5 Streaming (decisão importante)

**Não** usar o iframe `drive.google.com/file/d/<id>/preview`: não permite medir progresso, não tem autoplay/velocidade/atalhos controlados, mostra a marca do Drive e exige pasta pública.

Fluxo escolhido: **Next autoriza, Nginx transmite**.

1. O front pede `GET /api/v1/stream/[materialId]`. O cookie de sessão vai junto, porque `<video>` está na mesma origem.
2. A rota verifica sessão, feature e matrícula, busca o token da SA no Redis e responde **vazia**, com os headers `X-Accel-Redirect: /_drive/<drive_file_id>` e `X-Drive-Token: <token>`.
3. O Nginx (location `internal`) faz proxy para `https://www.googleapis.com/drive/v3/files/<id>?alt=media&supportsAllDrives=true` com `Authorization: Bearer`, repassando `Range`/`If-Range`. O seek funciona, o processo Node fica livre na hora, e o token nunca chega ao navegador.

```nginx
location /_drive/ {
    internal;
    resolver 1.1.1.1 8.8.8.8 ipv6=off valid=300s;
    set $drive_token $upstream_http_x_drive_token;
    if ($uri ~ ^/_drive/(?<drive_id>[A-Za-z0-9_-]+)$) { }
    proxy_set_header Authorization "Bearer $drive_token";
    proxy_set_header Range $http_range;
    proxy_set_header If-Range $http_if_range;
    proxy_set_header Host www.googleapis.com;
    proxy_ssl_server_name on;
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_hide_header Set-Cookie;
    proxy_hide_header X-GUploader-UploadID;
    add_header Cache-Control "private, max-age=3600";
    add_header Accept-Ranges bytes;
    proxy_pass https://www.googleapis.com/drive/v3/files/$drive_id?alt=media&supportsAllDrives=true;
}
```

- **Validar na fase 3** com `curl -I -H "Range: bytes=0-1"` que o Google responde `206` direto. Se vier `302`, tratar com `proxy_intercept_errors` + named location seguindo o `Location`.
- **Em dev (sem Nginx)**: com `STREAM_MODE=node`, a rota faz ela mesma o proxy com `fetch` repassando `Range` e devolvendo o corpo como stream (`Readable.fromWeb`). Desligar o body parser e o limite de resposta da rota (`export const config = { api: { bodyParser: false, responseLimit: false } }`).
- PDFs: mesmo endpoint, com `Content-Disposition: inline`.
- Vídeos precisam estar com **moov atom no início** (faststart) para começar a tocar sem baixar tudo. Documentar no `drive-setup.md`: `ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4`. Opcional (fase 8): job que detecta e avisa vídeos sem faststart.
- Riscos conhecidos: limites de download do Drive em uso intenso e simultâneo. Mitigação planejada (fase 8, opcional): cache LRU em disco dos vídeos mais acessados, servido pelo próprio Nginx.

---

## 6. API (`pages/api/v1/`, versionada como no curso)

```
GET    /status                           # banco, redis, fila, docling (o primeiro endpoint do curso)
POST   /sessions   DELETE /sessions      # login / logout
GET    /user                             # usuário da sessão
POST   /password-resets   PATCH /password-resets/[token]
GET    /invites/[token]   PATCH /invites/[token]       # aceitar convite e definir senha

GET    /courses                          # meus cursos + % de progresso + "continuar de onde parou"
GET    /courses/[slug]                   # detalhes + árvore completa (cacheada no Redis)
GET    /materials/[id]                   # metadados + progresso + notas do usuário
GET    /stream/[id]                      # §5.5
PUT    /progress/[materialId]            # { position_seconds, watched_delta, completed? }
POST   /progress/batch                   # flush do buffer do cliente (sendBeacon ao fechar a aba)
GET    /notes?course=&material=&q=&important=
POST   /notes   PATCH /notes/[id]   DELETE /notes/[id]
GET    /search?q=                        # cursos, módulos, aulas, notas (full-text do Postgres + unaccent)
GET    /me/stats   GET /me/reviews   PATCH /me/preferences

# admin (features de admin)
GET/POST /admin/courses   PATCH/DELETE /admin/courses/[id]
POST   /admin/courses/[id]/preview   POST /admin/courses/[id]/sync   GET /admin/courses/[id]/sync
GET/POST /admin/users   PATCH /admin/users/[id]   GET/POST/DELETE /admin/enrollments   POST /admin/invites
GET/POST /migrations                     # como no curso (protegido por feature)
```

- **Progresso**: o cliente envia heartbeat a cada 15 s durante a reprodução. A rota grava no Redis, e um job agendado faz o flush para o Postgres a cada 1 min (menos escrita). O material conta como concluído ao passar de **90%** (configurável) ou quando o usuário marca.
- **Tipos compartilhados**: front e API estão no mesmo projeto, então os schemas zod e os tipos ficam em `models/` e são importados dos dois lados. Não é preciso gerar cliente de OpenAPI.
- Erros no formato do curso: `{ name, message, action, status_code }`, com `message` e `action` em PT-BR.
- Paginação por cursor em listas grandes.

---

## 7. Experiência (funcionalidades)

### Mantidas da referência (reescritas em React)

- Árvore lateral Módulo → Aula → Material com progresso (x/y e %), expandir/recolher tudo, ícone por tipo, ✓ em concluídos, item ativo destacado, rolagem automática até o item atual.
- Autoplay da próxima aula (com contagem regressiva de 5 s cancelável).
- Vídeo flutuante (mini-player) ao rolar para baixo, e também ao **navegar para outra página**: o player global fica no `_app.tsx`.
- Anotações com timestamp: o botão sobre o vídeo e o atalho `N` pausam, abrem o editor e gravam o tempo. Clicar no timestamp pula o vídeo. Marcar importante, editar, excluir.
- Pomodoro (foco, pausa curta, pausa longa, som, configuração), sincronizado nas preferências do usuário.
- Barra de estatísticas e de progresso geral do curso.

### Novas (o que torna "inovador")

1. **Home "Continuar"**: card grande do último material com a posição ("Retomar em 12:34"), depois cursos em andamento, revisões do dia e meta de questões.
2. **Paleta de comandos `Ctrl/⌘+K`** (cmdk): busca instantânea em cursos, aulas, questões e anotações; ações rápidas ("Próxima aula", "Modo foco", "Iniciar Pomodoro").
3. **Modo Foco**: esconde tudo menos player e notas; integra com o Pomodoro.
4. **Modo Áudio / Podcast**: tocar vídeos e MP3 só como áudio, com player persistente no rodapé, para estudar no trânsito.
5. **Revisão espaçada**: ao concluir uma aula, agenda revisões em 1, 7 e 30 dias; a home lista o que vence hoje.
6. **Sequência e heatmap de estudo** (estilo GitHub), meta semanal de horas, tempo total por curso.
7. **Caderno do curso**: todas as anotações do curso em uma página, filtráveis, exportáveis em Markdown/PDF.
8. **PDF integrado**: leitor inline lembrando a última página; nota vinculada à página.
9. **Atalhos de teclado** (lista com `?`): `Espaço/K` play, `J/L` ±10 s, `←/→` ±5 s, `Shift+N` próxima aula, `N` nota, `F` tela cheia, `T` modo teatro, `[`/`]` velocidade.
10. **Lembra preferências**: velocidade, volume, legendas e autoplay, por usuário.
11. **PWA instalável** (manifest + service worker só para o shell da aplicação; não cachear vídeos).
12. **Responsivo de verdade**: no celular, a árvore vira bottom sheet; navegação inferior (Início, Cursos, Questões, Notas, Perfil).

### Futuro (não implementar sem pedido; deixar a arquitetura pronta)

- Transcrição automática dos vídeos → busca **dentro** do conteúdo falado e legendas.
- Resumos e flashcards gerados por IA a partir das notas e transcrições.
- Comentários e dúvidas por aula entre usuários.

---

## 8. Direção visual

**Conceito: "Biblioteca noturna"**, uma evolução moderna do preto + dourado da referência. Sofisticado, calmo, feito para estudar por horas.

- **Tema escuro como padrão**, tema claro (papel/creme com dourado envelhecido) como alternativa. Respeitar `prefers-color-scheme` e permitir escolha.
- **Tokens em `styles/tokens.css`** (CSS custom properties consumidas pelo Tailwind v4 `@theme`):
  ```css
  --bg: #0b0b0c;
  --surface: #131315;
  --surface-2: #1b1b1e;
  --border: #2a2a2e;
  --text: #ece9e2;
  --text-muted: #9a978f;
  --accent: #d4af37;
  --accent-soft: #f5d76e;
  --accent-deep: #a8892c;
  --success: #6fbf73;
  --danger: #e5484d;
  --radius: 14px;
  ```
- **Tipografia** via `next/font` (self-host automático): serifa contemporânea para títulos (ex.: _Fraunces_ ou _Instrument Serif_), _Inter_ ou _Geist_ na interface, números tabulares para tempos.
- **Capas de curso**: sem imagem, gerar capa com gradiente determinístico a partir do slug, com o título em serifa grande. Cada curso com identidade própria.
- Superfícies com borda fina e leve brilho dourado no hover. Vidro (backdrop-blur) só em overlays (player flutuante, paleta, modais).
- Movimento: View Transitions do navegador entre páginas quando disponível, micro-interações de 150–250 ms, respeitar `prefers-reduced-motion`.
- Layout bento na home; anel de progresso nos cards; barra dourada fina de progresso sob cada item da árvore.
- Acessibilidade: contraste AA, foco visível dourado, navegação completa por teclado (os primitivos Radix ajudam).
- **Evitar**: aparência de template genérico, emojis como ícones (usar Lucide), sombras pesadas, gradiente em todo lugar.

---

## 9. Infraestrutura

### Desenvolvimento (como no curso)

- `npm run dev` = `services:up` (compose em `infra/compose.yaml`: postgres com pgvector, redis, mailcatcher) → `services:wait:database` → `migrations:up` → `next dev`.
- `npm run worker:dev` roda o worker BullMQ com `tsx watch`.
- `npm run services:up -- --profile pdf` sobe também o `docling-serve` (pesado; só quando for mexer na ingestão de provas).
- `npm run seed` cria admin + curso de exemplo com **dados falsos** (`@faker-js/faker`), sem precisar do Drive, para desenvolver a UI offline.
- `npm test` = sobe os serviços, roda `next dev` e o Jest com `--runInBand` contra o servidor (padrão do curso).

### Produção — Oracle Cloud A1 (ARM64, Ubuntu), `infra/compose.prod.yaml`

- `nginx`: TLS via certbot (container com renovação), HTTP/2, gzip/brotli, headers de segurança (HSTS, CSP, X-Content-Type-Options, Referrer-Policy), location interna `/_drive/`, `limit_req` em `/api/v1/sessions`, cache longo em `/_next/static`.
- `web`: Next em modo `standalone` (`node server.js`), imagem `node:24-alpine` multi-stage.
- `worker`: mesma base de código, comando `node dist/worker/index.js` (compilado com `tsc` ou `tsup`).
- `migrate`: container de execução única para `migrations:up`, rodado pelo `deploy.sh`. **Nunca** migrar automaticamente ao subir o `web`.
- `db` (pgvector/pg17) com volume nomeado; `redis` com `appendonly yes`, `maxmemory 512mb`, `noeviction` (as filas do BullMQ não podem ser descartadas; o cache usa TTL).
- `docling` (profile `pdf`) com limite de memória ~6 GB; `ollama` opcional (profile `local-llm`, §12.4).
- Todas as imagens com variante **arm64**. O mais simples é **buildar direto na VM**; em máquina x86, usar `docker buildx build --platform linux/arm64`.
- Healthchecks em todos os serviços; `restart: unless-stopped`; logs em JSON com rotação (`max-size: 10m`).

### Pontos de atenção da Oracle (documentar em `infra/README.md`)

- Abrir as portas **80 e 443** na _Security List_ / NSG da VCN **e** no firewall do Ubuntu da imagem Oracle (vem com regras `iptables` que bloqueiam; ajustar e persistir com `netfilter-persistent`).
- Domínio apontando para o IP público reservado.
- Backups: `pg_dump` diário comprimido, retendo 7 diários + 4 semanais, enviado para **OCI Object Storage** (camada gratuita) ou para uma pasta do Drive. Testar a restauração.

### Variáveis

`.env.development` (commitado, sem segredos, como no curso) e `.env.example` para produção:

```
POSTGRES_HOST= POSTGRES_PORT= POSTGRES_USER= POSTGRES_DB= POSTGRES_PASSWORD=
DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB
REDIS_URL=redis://localhost:6379
WEBSERVER_ORIGIN=https://seu-dominio
EMAIL_SMTP_HOST= EMAIL_SMTP_PORT= EMAIL_SMTP_USER= EMAIL_SMTP_PASSWORD=   EMAIL_FROM=
GOOGLE_SA_FILE=/run/secrets/gdrive_sa.json
STREAM_MODE=nginx                     # nginx | node
PROGRESS_COMPLETE_RATIO=0.9
DOCLING_URL=http://docling:5001
GEMINI_API_KEY=                       # UMA chave, de UM projeto (§12.4: sem rotação de chaves)
AI_CHAINS_FILE=./config/ai-chains.yaml
AI_EMBED_MODEL=                       # um só modelo de embedding, sem fallback
AI_LOCAL_URL=                         # opcional: Ollama/llama.cpp na própria VM
AI_PAID_KEY=                          # opcional: chave paga com teto de gasto
AI_PAID_ENABLED=false
DAILY_QUESTION_GOAL_DEFAULT=20
SENTRY_DSN=                           # opcional
```

---

## 10. Plano de execução por fases

Cada fase termina com: testes passando, lint limpo, `npm run dev` funcionando, e a seção **Estado atual** atualizada. **Não pular fases. Não iniciar a próxima sem o dono validar.** As primeiras fases seguem a ordem do curso, para o dono ver na prática o que acabou de aprender.

| Fase                   | Entrega                                                                                                                                                                                              | Critério de aceite                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Fundação            | Next + TS, ESLint/Prettier, husky/commitlint/commitizen, `infra/compose.yaml`, `infra/database.ts`, node-pg-migrate, `GET /api/v1/status`, Jest + orchestrator, CI no GitHub Actions (lint + testes) | `npm run dev` sobe tudo; teste de integração do `/status` passa no CI                                                                                                                 |
| 1. Contas              | users, sessions, features, controller com `canRequest`, login/logout, convites, reset de senha com mailcatcher, rate-limit                                                                           | Testes de integração: login, bloqueio após 5 erros, convite de uso único, student recebe 403 nas rotas de admin                                                                       |
| 2. Cursos + Drive      | Tabelas, `buildTree` puro, preview, sync no worker BullMQ, telas de admin de cursos, seed                                                                                                            | Testes do `buildTree` com fixtures cobrindo as 3 estratégias, ordenação natural, atalhos, soft delete e **pasta com e sem os arquivos do player antigo**                              |
| 3. Streaming           | `/api/v1/stream/[id]`, config Nginx, fallback `STREAM_MODE=node`                                                                                                                                     | Vídeo toca e **faz seek** (206); student sem matrícula recebe 403; o token não aparece no navegador                                                                                   |
| 4. Experiência de aula | Página do curso, árvore, Vidstack, PDF, áudio, autoplay, mini-player global, atalhos                                                                                                                 | Navegar por um curso real inteiro pelo teclado; Lighthouse ≥ 90 em acessibilidade                                                                                                     |
| 5. Aprendizado         | Progresso (heartbeat + flush), notas com timestamp, Pomodoro, caderno do curso                                                                                                                       | Fechar a aba e reabrir retoma na posição; notas sobrevivem ao logout                                                                                                                  |
| 6. Engajamento         | Home "Continuar", paleta `Ctrl+K`, busca full-text, streak/heatmap, revisão espaçada, modo foco, modo áudio, PWA                                                                                     | Busca acha nota por palavra sem acento; revisões aparecem nos dias certos (testes com relógio falso do Jest)                                                                          |
| 7. Deploy              | `compose.prod.yaml`, nginx + TLS, backups, `deploy.sh`                                                                                                                                               | HTTPS A+ no SSL Labs; restauração de backup testada; reboot da VM volta tudo sozinho                                                                                                  |
| 8. Endurecimento       | Sentry (opcional), 2FA opcional, cache LRU de vídeos (opcional), detector de faststart, e2e com Playwright                                                                                           | Fluxo login → curso → assistir → nota → concluir passa no e2e                                                                                                                         |
| 8.1. Mobile & Telas     | Layout responsivo (360px–430px), bottom dock navigation, sala de aula adaptativa (player 16:9 + abas tátil), heatmap sem overflow, touch targets ≥ 44px                                              | Navegar, assistir aula e tomar nota perfeitamente no celular; testes E2E mobile passando                                                                                              |
| 9. Questões: base      | Tabelas do §12.2, taxonomia, `services/ai` com roteador de cota, importação manual e por JSON                                                                                                        | Testes com Gemini mockado: nunca passa do RPD; 429 diário pula para o próximo modelo; 503 abre o circuit breaker; `min_tier` faz o job esperar; ID inexistente é desativado na subida |
| 10. Ingestão de provas | Pipeline §12.3 (PDF → questões → gabarito → classificação → embedding → dedupe → revisão)                                                                                                            | Prova real de teste importada com ≥ 95% das questões corretas; fila de revisão funcional                                                                                              |
| 11. Resolver           | Tela de resolução (A–E e Certo/Errado), filtros, explicação pós-resposta, "chutei", reportar erro, metas diárias                                                                                     | Responder → ver gabarito + explicação; meta de 20 por disciplina contabiliza certo                                                                                                    |
| 12. Aula ↔ questões   | Vínculo §12.5, aba "Questões desta aula", pré-teste e prática pós-aula                                                                                                                               | Aula de "Crase" mostra questões de crase; admin consegue corrigir o vínculo                                                                                                           |
| 13. Desempenho e IA    | Painel de desempenho (SQL), caderno de erros com revisão espaçada, simulados, relatório semanal do coach IA                                                                                          | Números do painel batem com consulta SQL manual; relatório gera com 1 chamada por usuário                                                                                             |

---

## 11. Regras de trabalho para o agente

1. **Planeje antes de codar**: para qualquer tarefa não trivial, apresente um plano curto (arquivos afetados, riscos) e aguarde aprovação.
2. **Ensine enquanto faz**: ao introduzir um conceito que o curso ainda não cobriu (BullMQ, X-Accel-Redirect, pgvector), explique em 2–4 frases o que é e por que foi usado. Ao divergir do curso, diga onde e por quê.
3. **Passos pequenos e verificáveis**: um commit por unidade lógica, Conventional Commits (`feat(drive): ...`), validados pelo commitlint.
4. **Teste o que escreve**: testes de integração por rota em `tests/integration/api/v1/...`, como no curso; testes de unidade para funções puras (`buildTree`, parsers, roteador de IA). Drive e Gemini **sempre mockados** nos testes. Rode `npm run lint:eslint:check && npm run lint:prettier:check && npm test` antes de dizer que terminou.
5. **Verifique a UI de verdade**: depois de mudar telas, abra no navegador (o agente de navegador do Antigravity) e confira desktop **e** 390 px de largura, tema claro **e** escuro.
6. **Segurança sempre**: nunca commitar segredos, o JSON da Service Account ou tokens; SQL **sempre parametrizado** (`$1, $2`), nunca concatenado; toda rota de conteúdo checa feature **e** matrícula; Markdown das notas renderizado com sanitização (`react-markdown` sem HTML cru, ou DOMPurify).
7. **Não mude decisões do §2** sem propor um ADR e receber aprovação.
8. **Não adicione dependências** sem justificar em uma linha (o que resolve, alternativa descartada). Fixar versões exatas no `package.json`, como no curso.
9. **Performance**: evitar N+1 (montar a árvore do curso em no máximo 4 queries e cachear); `next/dynamic` para componentes pesados (player, PDF); listas grandes virtualizadas.
10. **Dúvidas de produto**: pergunte. Dúvidas técnicas com padrão óbvio: decida, siga e registre.
11. Ao final de cada sessão, atualize **Estado atual** abaixo.

### Trabalho híbrido (vários modelos/agentes no Antigravity)

- Este arquivo é a memória compartilhada. `AGENTS.md` e `GEMINI.md` só dizem "Siga integralmente o CLAUDE.md na raiz": **uma fonte de verdade só**.
- Divida por fronteira clara: um agente por fase ou área (ex.: sync do Drive em uma conversa, UI do player em outra). O contrato entre eles são os schemas zod em `models/`.
- Antes de trocar de agente ou modelo, o anterior atualiza o **Estado atual** e deixa a árvore do git limpa.

---

## 12. Plataforma de Questões (concursos) + IA

Objetivo: banco de questões de provas anteriores, integrado às aulas. O usuário responde, vê o gabarito oficial e uma explicação completa, acompanha o desempenho por disciplina e assunto, e cumpre uma **meta diária (padrão 20 questões por disciplina)**.

### 12.1 Princípios

- **O gabarito oficial definitivo é a verdade.** A IA explica a resposta oficial. Ela nunca decide o gabarito. Se a IA discordar, a questão vai para revisão com a flag `ai_disagrees`. Questões **anuladas** ou com gabarito alterado ficam marcadas e não contam para estatísticas.
- **IA gera uma vez e o resultado é reutilizado por todos.** A explicação é por questão, não por usuário. É gerada em segundo plano e guardada no banco, com `model` e `prompt_version`.
- **Números vêm do SQL; a IA só escreve a narrativa.** Taxa de acerto, evolução e ranking são calculados de forma determinística. A IA recebe agregados já calculados e escreve o diagnóstico.
- **Privacidade:** nunca enviar nome, e-mail ou outro dado pessoal à IA. No plano gratuito, os termos do Google permitem usar o conteúdo enviado para melhorar produtos.
- **Fontes:** importar provas e gabaritos **oficiais** (sites das bancas e órgãos). **Não raspar** sites comerciais de questões (termos de uso; os comentários deles têm direito autoral). Questões geradas por IA ficam separadas e com rótulo "Inédita (IA)".

### 12.2 Modelo de dados (adicional)

```
subjects (disciplinas)    name, slug, color                      ex.: Português, Matemática, Informática, Inglês
topics (assuntos)         subject_id, parent_id (árvore), name, slug, aliases text[]   ex.: Português > Sintaxe > Crase
boards (bancas)           name, slug, answer_format[multiple_choice|true_false], scoring jsonb (Cebraspe: errada anula certa)
exams (provas)            board_id, organ, position (cargo), level, year, exam_pdf_path, answer_key_pdf_path,
                          source_url, file_hash (único), status[uploaded|extracting|review|published|error], solved_by_layer
support_texts             exam_id, label ("Texto I"), body, image_path   — compartilhado por várias questões
questions                 exam_id (null p/ inédita IA), number, statement (markdown), support_text_id (null),
                          image_paths text[], format[multiple_choice|true_false], correct_answer,
                          status[draft|reviewed|published], is_annulled, origin[official|ai_generated],
                          difficulty (calculada), embedding vector(…), ai_disagrees, extraction_confidence
alternatives              question_id, letter, body
question_topics           question_id, topic_id, confidence, source[ai|admin]
explanations              question_id, body (markdown), per_alternative jsonb, model, prompt_version, rating_up, rating_down
answers                   user_id, question_id, chosen, is_correct, guessed, time_ms,
                          context[free|lesson|simulado|review], lesson_id (null), simulado_id (null)
error_reviews             user_id, question_id, fsrs_state jsonb, due_at          — revisão espaçada dos erros (ts-fsrs)
simulados                 user_id, filters jsonb, time_limit, started_at, finished_at, score jsonb
question_reports          user_id, question_id, reason, body, resolved_at
daily_goals               user_id, subject_id, target (padrão 20), active_weekdays int[]
lesson_topics             lesson_id, topic_id, confidence, source[ai|admin]
ai_jobs                   kind, model, status, attempts, tokens_in, tokens_out, payload_ref, error, scheduled_for
```

### 12.3 Pipeline de ingestão de provas (worker BullMQ, filas `pdf` e `ai`)

1. **Entrada:** admin envia o PDF da prova e o PDF do gabarito. Também aceitar uma pasta `Provas/` no Drive, sincronizada como em §5.4. O sistema calcula o hash e recusa duplicata.
2. **Gabarito primeiro, sem IA:** extrair o texto com `unpdf` (pdf.js no Node) e fazer o parse com regex por banca. Usar a IA só se o parse falhar.
3. **Extração das questões, em camadas (do mais barato ao mais caro):**
   - **3a. Converter localmente com Docling** (`services/pdfparse`, chamando `DOCLING_URL`; fila `pdf` com concorrência 1). O resultado é Markdown em ordem de leitura correta, que resolve as provas em **duas colunas**, mais um JSON com a posição de cada bloco na página. OCR **só** em páginas sem texto, ou seja, provas escaneadas.
   - **3b. Parser determinístico por banca** sobre o Markdown: regex para "Questão N" / "N." e para as alternativas "(A)…(E)" ou o formato Certo/Errado do Cebraspe. Se o número de questões e de alternativas bater com o gabarito, a prova **não gasta IA**.
   - **3c. Estruturar com IA só o que falhou:** enviar o **Markdown** (não o PDF) dos trechos problemáticos à cadeia `bulk` (§12.4), com **saída estruturada** (JSON Schema gerado do zod). Campos: número, enunciado, texto de apoio, alternativas, formato e "tem imagem".
   - **3d. Último recurso:** enviar o PDF original (ou só as páginas problemáticas) à cadeia `vision` (§12.4).
   - Gravar em `exams.solved_by_layer` qual camada resolveu cada prova, para medir a qualidade.
4. **Imagens:** o Docling devolve as figuras recortadas e a posição de cada uma; ligá-las à questão pela página e posição.
   - **Teste antes de decidir (início da fase 10):** escolher 5 provas reais: Cebraspe em 2 colunas, FGV, FCC/Vunesp, uma com matemática ou figuras e uma escaneada. Rodar Docling e Marker (modo `fast`, CPU), medir na A1 a % de questões separadas corretamente e o tempo por página, e registrar um ADR. Não usar o `--use_llm` do Marker: ele gastaria a cota do Gemini por fora do roteador.
5. **Cruzar** as questões com o gabarito pelo número e marcar as anuladas.
6. **Classificar** disciplina e assunto usando a **taxonomia fixa** (cadeia `fast`, em lotes de 10–20 questões por chamada). A IA escolhe um ID da lista e não inventa assunto novo; quando nada servir, sugere um assunto novo para o admin aprovar.
7. **Embedding** em lote e **deduplicação**: similaridade de cosseno > 0,95 com outra questão vira "possível duplicata", para revisão.
8. **Revisão:** tela do admin com o PDF ao lado da questão extraída, para corrigir e publicar. Questões com `extraction_confidence` alta podem ser publicadas em lote.
9. **Explicações** geradas em segundo plano para as questões publicadas, com prioridade baixa (ver §12.4).

### 12.4 Roteador de IA: cadeias de fallback e cota (obrigatório)

Todo uso de IA passa por `services/ai/router.ts`. Nenhum outro módulo chama o SDK direto. A tarefa pede uma **cadeia** (`deep`, `bulk`, `fast`, `vision`), e o roteador escolhe o primeiro modelo da cadeia que tenha cota e esteja saudável.

#### Modelos disponíveis (plano gratuito do projeto do dono, out/2026)

| ID na API               | Cota gratuita                   | Papel no projeto                                                                                                       |
| ----------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `gemini-3.8-flash`      | 5 RPM / 20 RPD                  | Principal da cadeia `deep`: raciocínio difícil, explicações de questões complexas, relatório do coach, edital          |
| `gemini-3.7-flash`      | 5 RPM / 20 RPD                  | 1º fallback de `deep`. **Não aparece no painel de limites que o dono enviou: validar com `models.list` antes de usar** |
| `gemini-3.6-flash`      | 5 RPM / 20 RPD                  | 2º fallback de `deep`                                                                                                  |
| `gemini-3-flash`        | 5 RPM / 20 RPD                  | 3º fallback de `deep` e reserva para `vision`                                                                          |
| `gemini-3.5-flash-lite` | 15 RPM / 500 RPD                | Principal de `bulk` e `vision` (multimodal: páginas escaneadas, imagens de questões); fallback de emergência de `deep` |
| `gemini-3.1-flash-lite` | 15 RPM / 500 RPD                | Principal de `fast`: classificação de assunto, triagem de reportes, moderação, sim/não                                 |
| Gemma 4 26B / 31B       | 30 RPM / 14,4K RPD, **16K TPM** | Fallback de `fast` e `bulk` só para prompts curtos (o TPM é baixo). ID exato: conferir em `models.list`                |
| Modelo local (opcional) | ilimitado, lento                | Último nível de `fast`, via Ollama/llama.cpp na A1 (CPU ARM, poucos tokens/s)                                          |

A cota é **por modelo** dentro do projeto. Por isso a cadeia soma capacidade de forma legítima: cerca de 80 chamadas "Flash" por dia, mais 1.000 "Lite", mais o Gemma.

#### Cadeias (`config/ai-chains.yaml`, editável sem mudar código; validado com zod ao carregar)

```yaml
deep: [gemini-3.8-flash, gemini-3.7-flash, gemini-3.6-flash, gemini-3-flash, gemini-3.5-flash-lite]
bulk: [gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemma-4-31b, local]
fast: [gemini-3.1-flash-lite, gemma-4-26b, gemini-3.5-flash-lite, local]
vision: [gemini-3.5-flash-lite, gemini-3-flash, gemini-3.6-flash]
limits: # espelhar o painel do AI Studio, com folga de ~10%
  gemini-3.8-flash: { rpm: 5, rpd: 18 }
  gemini-3.7-flash: { rpm: 5, rpd: 18 }
  gemini-3.6-flash: { rpm: 5, rpd: 18 }
  gemini-3-flash: { rpm: 5, rpd: 18 }
  gemini-3.5-flash-lite: { rpm: 14, rpd: 450 }
  gemini-3.1-flash-lite: { rpm: 14, rpd: 450 }
  gemma-4-31b: { rpm: 28, rpd: 13000, tpm: 15000 }
  gemma-4-26b: { rpm: 28, rpd: 13000, tpm: 15000 }
min_tier: # pior modelo aceitável por tarefa; abaixo disso, o job ESPERA em vez de cair
  question_explanation_hard: gemini-3-flash
  coach_report: gemini-3.5-flash-lite
  topic_classification: local
```

- O mesmo modelo pode estar em várias cadeias. O balde de cota é **por modelo**, não por cadeia.
- `min_tier` evita que uma tarefa importante seja feita por um modelo fraco demais. Ela aguarda o dia seguinte.

#### Regras do roteador

1. **Validação na subida do worker:** chamar `models.list` e desativar da cadeia qualquer ID que não exista, com alerta no painel do admin. Isso cobre o caso do `gemini-3.7-flash`.
2. **Cota local antes da chamada:** token bucket no Redis por modelo (RPM, RPD e TPM quando houver). Sem cota, pular direto para o próximo modelo, sem chamar a API.
3. **Leitura do erro do Google:**
   - 429 de limite **por minuto** → esperar o tempo indicado (`retryDelay`) ou ir ao próximo modelo, conforme a prioridade do job;
   - 429 de limite **diário** (`RESOURCE_EXHAUSTED` / quota de RPD) → marcar o modelo como esgotado até o reinício da cota (confirmar o horário; a referência é meia-noite do horário do Pacífico) e ir ao próximo;
   - 500/503 (sobrecarga) → **circuit breaker**: tirar o modelo da rotação por 5 minutos e ir ao próximo;
   - 400 (erro do pedido) → não tentar outro modelo; registrar e falhar o job.
4. **Prioridades** (prioridade de job do BullMQ): (1) explicação pedida por um usuário que acabou de responder; (2) extração de prova; (3) explicações em segundo plano; (4) relatórios. Jobs de prioridade 3–4 **não** consomem os últimos 20% da cota diária do modelo, que ficam reservados para a prioridade 1.
5. **Lotes:** sempre agrupar (10 explicações ou 20 classificações por chamada), respeitando o TPM do modelo. Para o Gemma, lotes menores.
6. **Rastreio e upgrade:** toda saída grava o `model` usado. Um job noturno **regera** com o melhor modelo da cadeia as explicações feitas por fallback, usando só a cota que sobrou no dia.
7. **Sem fallback de embedding:** vetores de modelos diferentes não são comparáveis. Se a cota acabar, o job espera.
8. **Painel "IA hoje" no admin:** uso e restante por modelo, modelos esgotados ou em circuit breaker, e jobs aguardando.
9. **Prompts versionados** em `services/ai/prompts/*.md` com `prompt_version`. Os prompts exigem saída em JSON Schema (gerado do zod com `z.toJSONSchema`), e a saída é validada com o mesmo schema zod. Se a validação falhar, uma nova tentativa no mesmo modelo e depois o próximo.

#### Fora do escopo: rotação de chaves entre projetos/contas

**Não implementar** rotação de várias API keys, projetos ou contas para somar cotas gratuitas. Os termos das APIs do Google proíbem contornar limites, e o risco é a suspensão da conta, incluindo a do Drive que hospeda os cursos. Usar **uma** chave de **um** projeto. Se a cota gratuita não bastar, usar, nesta ordem:

- **lotes e cache maiores**;
- **modelo local** na VM para tarefas simples;
- **plano pago com teto de gasto** (`AI_PAID_ENABLED`), usando a Batch API para os jobs de segundo plano. A chave paga entra como mais um nível no fim das cadeias.

#### Modelo local opcional (profile `local-llm` no compose)

- Container Ollama (ou llama.cpp server) com um modelo pequeno e quantizado, que caiba em ~6–8 GB de RAM.
- Usar só em `fast`/`bulk` com prompts curtos: classificar assunto ou responder sim/não.
- Concorrência 1. Não rodar ao mesmo tempo que o Docling (fila `pdf`), para não estourar a memória da A1.
- Medir a qualidade na mesma amostra do teste da fase 10 antes de ativar.

### 12.5 Aula ↔ questões

- **Na sincronização do curso** (§5.4), classificar cada aula nos `topics`, usando título da aula, nome do módulo e, se houver, o texto das primeiras páginas do PDF da aula. Calcular o embedding da aula. O admin pode ajustar o vínculo.
- **Na página da aula:** aba "Questões desta aula", com questões do mesmo assunto, ordenadas por similaridade e filtráveis por banca.
- **Pré-teste (opcional):** 3 questões rápidas antes do vídeo. Tentar responder antes de estudar melhora a retenção.
- **Prática pós-aula:** ao concluir o vídeo, aparece o cartão "Pratique agora: 10 questões". As respostas são salvas com `context = 'lesson'`.

### 12.6 Resolver questões (UX)

- Uma questão por vez, em tela limpa, com atalhos `A`–`E` / `C`–`E` (Certo/Errado), `Enter` para confirmar e `→` para a próxima.
- **Antes de confirmar:** cortar alternativas (riscar) e marcar "chutei". Acerto com "chutei" não conta como domínio do assunto.
- **Depois de responder:** gabarito oficial, % de acerto dos usuários da plataforma, explicação geral, por que cada alternativa está certa ou errada, link para a aula relacionada, e botões 👍/👎 e "Reportar erro".
- Botão "Ainda não entendi": abre um chat curto sobre a questão, com limite diário por usuário por causa da cota.
- Filtros: disciplina, assunto, banca, órgão, cargo, ano, nível, dificuldade, "não resolvidas", "errei", "chutei".
- **Simulados:** com tempo, no estilo da banca, com a pontuação da banca (no Cebraspe, errada anula certa), resultado por disciplina e comparação com os outros usuários.
- **Meta diária:** padrão de 20 por disciplina, ajustável por disciplina e por dia da semana. Anel de progresso na home e lembrete por notificação do PWA. A sequência de dias de estudo (§7) passa a considerar aulas **ou** a meta de questões.

### 12.7 Desempenho e coach de IA

- **Painel (SQL):** acerto por disciplina, assunto e banca; evolução semanal; tempo médio por questão; **mapa de calor de assuntos** (vermelho = fraco); e o comparativo "acerto real" versus "acerto sem chutes".
- **Caderno de erros:** as questões erradas entram em revisão espaçada (algoritmo **FSRS**, pacote `ts-fsrs`). Ao errar, o usuário marca o motivo: "não sabia", "falta de atenção" ou "interpretação".
- **Relatório semanal do coach:** 1 chamada por usuário por semana, com os agregados em JSON. A IA aponta pontos fracos, o padrão dos erros e um plano para a próxima semana, com links para aulas e cadernos.
- **Recomendações:** priorizar os assuntos com **muita incidência na banca** e **pouco acerto do usuário**. A incidência é calculada a partir do próprio banco de provas.

### 12.8 Ideias para depois (não implementar sem pedido)

- **Edital verticalizado:** o usuário envia o PDF do edital, a IA extrai o conteúdo programático e o liga aos `topics`. O resultado é um checklist com % por assunto, somando aulas e questões.
- **Ciclo de estudos automático**, a partir do edital, das horas disponíveis e dos pontos fracos.
- **Questões inéditas por IA** no estilo da banca, para assuntos com poucas questões oficiais, sempre com rótulo e revisão.
- **Flashcards** gerados dos erros e das notas.
- **Correção de discursiva/redação** por IA, com critérios da banca.
- **Ranking/ligas** semanais entre os usuários.
- Dificuldade por TRI quando houver respostas suficientes.

---

## 13. Estado atual

- **Fase:** 8 (concluída)
- **Feito:**
  - **Fase 0 (Fundação):** Next.js 15, Node 24, TS strict, Docker Compose, migrações, `GET /api/v1/status`, orquestrador de testes e CI.
  - **Fase 1 (Contas e Autenticação):** users, sessions, invites, password_resets, rate-limiting, sliding sessions, middlewares `injectAnonymousOrUser` e `canRequest(feature)`.
  - **Fase 2 (Cursos + Google Drive):** courses, modules, lessons, materials, enrollments, sync_runs, função pura `buildTree`, fila BullMQ, endpoints de cursos e admin, seed offline, importação do curso real do Google Drive com 48 módulos, 382 materiais e 2.733 minutos.
  - **Fase 3 (Streaming Seguro):** endpoint `/api/v1/stream/[id]`, X-Accel-Redirect e Range Requests (HTTP 206), verificação de matrícula, streaming via cache local em SSD com resposta de 9ms e background download a 22 MB/s.
  - **Fase 4 (Experiência de Aula):**
    - Design tokens da "Biblioteca Noturna" em `styles/tokens.css` e integração com Tailwind CSS v4.
    - `PlayerContext` global montado em `pages/_app.tsx` com reatividade de mídia, persistência de preferências em `localStorage` e suporte ao `GlobalMiniPlayer`.
    - Player de vídeo (`components/player/VideoPlayer.tsx`) com streaming direto, Range Requests seek, controle de velocidade (0.5x–2.5x), modo teatro (`T`), fullscreen (`F`), play/pause (`Espaço/K`) e contagem regressiva de 5s para autoplay da próxima aula.
    - Árvore lateral hierárquica Módulo → Aula → Materiais (`components/course/CourseSidebar.tsx`) com busca instantânea, indicadores de progresso percentual e $x/y$, expansão/recolhimento e auto-scroll até a aula ativa.
    - Mini-player flutuante global (`components/player/GlobalMiniPlayer.tsx`) disparado automaticamente ao rolar a página ou navegar.
    - Leitor de PDF inline (`components/player/PdfViewer.tsx`) com zoom e lembrança da última página lida por material.
    - Modo Áudio dedicado (`components/player/AudioPlayer.tsx`) para estudo com menor uso de tela/dados.
    - Atalhos de teclado universais (`hooks/useShortcuts.ts`) com modal interativo de ajuda (`?`).
    - Eliminação do loop de áudio/gargalo através do desacoplamento de `onTimeProgress` vs `seekTo`.
  - **Fase 5 (Aprendizado Ativo):**
    - Migração `6_create-learning-schema.ts`: tabelas `progress`, `notes` e `user_preferences`.
    - Persistência contínua de progresso com heartbeat a cada 15 segundos e `navigator.sendBeacon` para flush instantâneo no fechamento de abas.
    - Conclusão automática de aulas ao atingir 90% assistido (`PROGRESS_COMPLETE_RATIO`) e sincronização em tempo real na árvore da barra lateral.
    - Retomada automática da aula e posição no segundo exato em que o usuário parou, com toast explicativo na tela.
    - Anotações inteligentes por aula (`components/player/NotesSection.tsx`) com captura automática de timestamp clicável (`▶ 04:32`), atalho `N` (pausa o vídeo e foca o texto) e marcação de "Importante" (⭐).
    - Cronômetro Pomodoro (`components/player/PomodoroTimer.tsx`) integrado à barra superior com modos Foco (25m), Pausa Curta (5m) e Longa (15m), sintetizador de sino suave via Web Audio API e preferências salvas no banco.
    - Caderno de Estudos do Curso (`pages/courses/[slug]/caderno.tsx`) agrupado por módulos e aulas com busca em tempo real e exportação para arquivo Markdown (.md).
    - Painel administrativo de cursos (`/admin/courses` e `/admin/courses/new`) com preview em tempo real de pastas do Google Drive e sincronização direta instantânea.
  - **Fase 6 (Engajamento & Produtividade):**
    - Migração `7_create-engagement-schema.ts`: extensão `unaccent`, tabela `study_days` e tabela `reviews`.
    - Dashboard do Estudante na Home (`pages/index.tsx`) com Hero "Continuar Assistindo" inteligente e retomada no segundo exato.
    - Paleta de Comandos Global (`components/search/CommandPalette.tsx`) ativada por `Ctrl+K` / `Cmd+K` com busca unificada em cursos, aulas e notas pessoais.
    - Busca Full-Text insensível a acentos (`GET /api/v1/search?q=`) com normalização pelo PostgreSQL `unaccent`.
    - Sistema de Revisão Espaçada (1d, 7d, 30d): agendamento automático ao concluir aulas (`models/review.ts`), fila de revisões de hoje (`components/home/DueReviews.tsx`) e conclusão via `POST /api/v1/me/reviews/[id]/complete`.
    - Sequência de Estudos e Heatmap estilo GitHub (`components/home/StudyStreak.tsx` e `components/home/StudyHeatmap.tsx`) com 20 semanas de histórico e indicador de ofensiva (`🔥 X dias seguidos`).
    - Modo Foco (`Shift+F`) no player (`pages/courses/[slug].tsx`) eliminando distrações e expandindo a área de aula.
    - Suporte PWA com `manifest.json` e Service Worker isolado (`public/sw.js`) sem cachear vídeos.
    - 53 testes automatizados passando no Jest (17 test suites 100% verde).
    - Caderno de estudos criado em `docs/learning/fase-6-engajamento.md`.
  - **Fase 7 (Deploy e Infraestrutura de Produção):**
    - `next.config.mjs` configurado com `output: "standalone"` para imagens Docker mínimas (~150MB).
    - `Dockerfile` multi-stage otimizado para ARM64 / Node 24 Alpine, buildando o Next.js standalone e o worker BullMQ via `esbuild`.
    - `infra/compose.prod.yaml` configurado com PostgreSQL 17 + pgvector isolado em rede interna (`cdf-network` sem expor porta 5432 no host, evitando conflito com containers legados), Redis 7 com persistência e limite de 512MB, containers `web`, `worker`, `migrate` e `nginx`.
    - `infra/nginx/prod.conf` com compressão gzip, headers de segurança OWASP, rate-limiting em `/api/v1/sessions`, cache imutável de assets estáticos e location interna `/_drive/` para aceleração de streaming Range Requests (206).
    - `infra/scripts/backup.sh` com backup diário comprimido do Postgres e retenção automática de 7 dias.
    - `deploy.sh` automatizado executando `git pull`, `build`, migrações pontuais com `run --rm migrate`, inicialização dos serviços e verificação de saúde HTTP.
    - `infra/README.md` com arquitetura de integração transparente com o proxy `lupa-caddy` e DNS do Registro.br.
  - **Fase 8 (Polimento, Hardening & Testes E2E):**
    - Toggle interativo de cursos para alunos no painel de convites (`/admin/invites`) com badges verde (ativo) e vermelho (bloqueado), com persistência e preservação de histórico.
    - Logout instantâneo com redirecionamento síncrono para `/login`.
    - Volume Boost até 200% via Web Audio API (`AudioContext` + `GainNode`) nos players de vídeo e áudio, com atalhos de volume.
    - Transferência sem interrupção de tempo na alternância dinâmica de modo Vídeo para Áudio e vice-versa.
    - Política de segurança de disco LRU para o cache de mídia em SSD/disco da VM com limite seguro de 25GB e auto-limpeza em 80%.
    - Script verificador de MP4 FastStart (`infra/scripts/check-faststart.ts`) inspecionando caixas `moov` e `mdat`.
    - Suíte completa de testes E2E com Playwright Chromium (`tests/e2e/student-flow.spec.ts`) com 5 cenários cobrindo o fluxo completo de ponta a ponta (100% verde em ~16s).
    - Atualização otimizada do cache SWR no login (`pages/login.tsx`) e isolamento no Jest (`jest.config.js`).
- **Estratégia de Branches & Foco Atual:**
  - Branch `main`: Alinhada estritamente com o deploy em produção na VM Oracle (`7f8235d`).
  - Branch `feat/questions`: Salva e versionada no GitHub com todo o módulo de questões desenvolvido (Fase 9 & 10).
  - Branch ativa: `feat/mobile-responsive` (foco total na experiência e usabilidade em celulares).
- **Próximo passo:** Fase 8.1: Etapa 5 — Suíte Final de Testes E2E Mobile no Playwright, PWA Safe Areas e Polimento Final. [Etapas 1, 2, 3 e 4 concluídas com 100% de testes E2E verdes].
- **Problemas conhecidos:** —
- **Decisões pendentes com o dono:** nome definitivo da plataforma; domínio; provedor de e-mail (SMTP); lista inicial de disciplinas/assuntos (taxonomia) e bancas prioritárias; se a plataforma será só para uso próprio/grupo fechado ou comercial (afeta plano da IA e questões de direito autoral).

---

## 14. Plano de Implementação: Frontend Mobile & Responsividade Completa

> Este plano guia o desenvolvimento na branch `feat/mobile-responsive`, garantindo que a plataforma seja tão agradável e fluida no smartphone quanto no desktop.

### 14.1 Princípios e Resoluções-Alvo
- **Viewports de referência:** 360px (Galaxy S pequeno), 390px (iPhone 13/14/15 padrão), 412px (Pixel), até 768px (tablets em modo retrato).
- **Mobile First / Thumb-Friendly:** Ações primárias no alcance do polegar (zona inferior da tela). Área mínima de toque de 44x44px em botões e links.
- **Safe Areas:** Respeito a entalhes e barras de gestos (`pb-[env(safe-area-inset-bottom)]`).
- **PWA Experience:** Sensação de aplicativo nativo sem barras de rolagem horizontais indesejadas (`overflow-x: hidden`).

### 14.2 Etapas de Execução

#### Etapa 1: Fundação do Layout Mobile & Navegação Inferior (Mobile Bottom Dock)
- Criar `components/layout/MobileBottomNav.tsx`:
  - Barra de navegação fixa inferior (`fixed bottom-0 left-0 right-0 z-40`) com fundo escuro e vidro (`bg-[#131315]/95 backdrop-blur-md border-t border-[#2a2a2e]`).
  - Itens táteis com ícones Lucide:
    - 🏠 **Início** (`/`)
    - 📚 **Cursos** (`/courses`)
    - 🔍 **Buscar** (dispara `CommandPalette`)
    - 👤 **Menu/Perfil** (abre modal/drawer com opções de conta, atalhos e logout)
  - Indicador ativo com brilho sutil em dourado (`#d4af37`).
  - Visível exclusivamente no celular (`md:hidden`).
- Header Global:
  - Ocultar navegação de texto redundante em telas menores que `sm`.
  - Adicionar espaçamento inferior (`pb-20 md:pb-6`) em todas as páginas para o conteúdo não ficar sob o dock.

#### Etapa 2: Sala de Aula e Player no Celular (`pages/courses/[slug].tsx`)
- **Player de Vídeo/Áudio:**
  - Largura total (`w-full`) com proporção 16:9 (`aspect-video`) fixa no topo da visualização.
  - Alternância rápida para modo áudio em 1 toque.
- **Sistema de Abas Tácteis Inferiores ao Player:**
  - Em desktop: mantém a barra lateral direita (`CourseSidebar`).
  - Em mobile: substitui a coluna lateral por abas organizadas:
    - **[ 📋 Aulas ]:** Lista modular expansível de aulas com status de progresso, duração e toque direto para troca imediata de aula.
    - **[ ✍️ Anotações ]:** Área de notas com campo de edição adaptado para não ser coberto pelo teclado virtual do celular.
    - **[ 📄 Materiais ]:** Acesso a PDFs e anexos da aula com leitor embutido ou download rápido.
- Botão/Barra de Aula Atual para avançar para a próxima aula com conforto.

#### Etapa 3: Dashboard do Estudante Responsivo (`pages/index.tsx`)
- **Card Hero "Continuar Assistindo":**
  - Layout empilhado (`flex-col sm:flex-row`), botão de play em largura total no mobile.
- **Mapa de Calor de Estudos (`StudyHeatmap.tsx`):**
  - Adicionar container com rolagem horizontal suave (`overflow-x-auto`) e foco automático no final da grade (semanas recentes), eliminando quebra de largura.
- **Sequência de Estudos e Revisões de Hoje (`StudyStreak.tsx` e `DueReviews.tsx`):**
  - Tipografia fluida e cards de revisão confortáveis para toque.

#### Etapa 4: Caderno de Estudos e Telas Secundárias
- **Caderno de Estudos (`/caderno`):**
  - Seletor de módulo em dropdown responsivo em vez de sidebar fixa.
  - Cartões de anotações com visual limpo e botões de ação com espaçamento tátil.
- **Catálogo de Cursos (`/courses`):**
  - Cards de cursos em 1 coluna no mobile (`grid-cols-1 sm:grid-cols-2`).
- **Tela de Login (`/login`):**
  - Centralização vertical com margens confortáveis no mobile (`px-4`).

#### Etapa 5: Suíte de Testes E2E Mobile no Playwright & Validação Visual
- Adicionar projeto de teste mobile no `playwright.config.ts` com perfil `Pixel 7` ou `iPhone 14`.
- Criar cenário de teste E2E mobile:
  - Login em tela 390px.
  - Navegação via Bottom Nav.
  - Troca de aula e leitura de anotações na Sala de Aula mobile.
- Garantir 100% dos testes verdes sem quebras de layout.
- **Decisões pendentes com o dono:** nome definitivo da plataforma; domínio; provedor de e-mail (SMTP); lista inicial de disciplinas/assuntos (taxonomia) e bancas prioritárias; se a plataforma será só para uso próprio/grupo fechado ou comercial (afeta plano da IA e questões de direito autoral).
