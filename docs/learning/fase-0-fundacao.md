# Fase 0 — Fundação do Projeto

> **Analogia geral:** Se você fosse começar um projeto Django do zero, você rodaria
> `django-admin startproject`, criaria o `settings.py`, configuraria o banco no
> `DATABASES`, instalaria o `pytest-django`... Esta fase é exatamente isso, mas
> no mundo Node/Next.js.

---

## 1. A Stack e por que cada peça existe

### Next.js (= Django + um pouquinho de React)

No Django, você tem:

- **Views** → funções/classes que recebem uma `request` e retornam uma `response`.
- **URLs** → `urls.py` que mapeia uma rota para uma view.
- **Templates** → HTML com Jinja2.

No Next.js com **Pages Router** (o modo que usamos):

- **`pages/api/v1/*.ts`** → são suas views de API. Cada arquivo é uma rota automaticamente. Sem `urls.py`.
- **`pages/*.tsx`** → são suas views de frontend (retornam componentes React em vez de templates HTML).
- Tudo em **TypeScript**, que é JavaScript com tipos (pense em type hints do Python, mas obrigatórios e verificados em tempo de compilação).

> **Por que Pages Router e não App Router?**
> O Next.js lançou o "App Router" (mais moderno), mas o curso.dev usa o Pages Router.
> Seguimos o curso para que você possa acompanhar as aulas sem se perder.

---

### TypeScript `strict: true` (= Mypy no modo paranóico)

No Python você pode ter type hints opcionais. No TypeScript com `strict: true`, os tipos são obrigatórios e o compilador barra qualquer inconsistência antes de você rodar o código. É incômodo no começo, mas salva muitas horas de debug.

**Arquivo de configuração:** [`tsconfig.json`](../../tsconfig.json)

```jsonc
{
  "compilerOptions": {
    "strict": true, // ativa todas as verificações rígidas
    "baseUrl": ".", // permite imports como @/infra/database
    "paths": { "@/*": ["./*"] },
  },
}
```

---

### PostgreSQL + `pg` (= psycopg2, mas sem ORM)

No Django você usa o ORM (`Model`, `QuerySet`, `.filter()`, `.save()`...).

Neste projeto, **não usamos ORM**. Escrevemos SQL puro, como o curso ensina. Por quê?

1. Você aprende SQL de verdade — o que acontece por baixo do ORM.
2. Mais controle e previsibilidade em queries complexas.
3. O curso ensina assim, então as aulas fazem sentido direto.

A única camada que temos é o **pool de conexões** em [`infra/database.ts`](../../infra/database.ts):

```typescript
// Isso é basicamente o seu django.db.connection, mas manual.
// pool: mantém N conexões abertas e reutiliza — mais eficiente que
// abrir e fechar a cada requisição.
const pool = new Pool({ host, port, user, database, password });

// Nossa função helper — análoga a cursor.execute() do psycopg2
async function query(queryText: string, values?: any[]) {
  const client = await pool.connect(); // pega uma conexão do pool
  try {
    return await client.query(queryText, values); // executa o SQL
  } finally {
    client.release(); // devolve a conexão ao pool (SEMPRE, mesmo com erro)
  }
}
```

> **Por que `$1, $2` em vez de `%s`?**
> Igual ao psycopg2: parâmetros posicionais protegem contra **SQL Injection**.
> Nunca concatene strings em queries SQL.

---

### node-pg-migrate (= Alembic ou `manage.py migrate`)

No Django, você tem `python manage.py makemigrations` e `python manage.py migrate`.

Aqui usamos `node-pg-migrate`:

```bash
# Criar uma nova migração (gera um arquivo vazio com timestamp)
npm run migrations:create -- nome-da-migracao

# Aplicar todas as migrações pendentes
npm run migrations:up

# Desfazer a última migração
npm run migrations:down
```

As migrações ficam em [`infra/migrations/`](../../infra/migrations/). Cada arquivo é um `.ts` com duas funções:

```typescript
// up: o que FAZER (= o corpo do seu makemigrations)
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('users', { ... });
}

// down: como DESFAZER (o Django gera automático; aqui escrevemos à mão)
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('users');
}
```

---

### Docker Compose (= o `docker-compose.yml` que você já conhece)

O arquivo [`infra/compose.yaml`](../../infra/compose.yaml) sobe 3 serviços locais:

| Serviço                                   | Django equivalente   | URL local                                             |
| ----------------------------------------- | -------------------- | ----------------------------------------------------- |
| `cdf-database` (PostgreSQL 17 + pgvector) | seu banco de dev     | `localhost:5432`                                      |
| `cdf-redis` (Redis 7)                     | Django cache backend | `localhost:6379`                                      |
| `cdf-mailcatcher`                         | `django-mailer` + UI | SMTP: `localhost:1025` · Web: `http://localhost:1080` |

```bash
npm run services:up    # docker compose up -d
npm run services:stop  # docker compose stop
npm run services:down  # docker compose down
```

> **Mailcatcher:** qualquer e-mail enviado pela aplicação em dev é capturado aqui.
> Abra `http://localhost:1080` no navegador para ver os e-mails.

---

### Jest (= pytest)

No Django você usa `pytest` com `pytest-django`. Aqui usamos **Jest**.

A grande diferença do curso: os testes de integração rodam contra o servidor **real** (`next dev`) com o banco **real** (PostgreSQL no Docker). Não tem mock do banco, não tem SQLite em memória — você testa o comportamento verdadeiro.

**Arquivo de configuração:** [`jest.config.js`](../../jest.config.js)

O **orquestrador** [`tests/orchestrator.ts`](../../tests/orchestrator.ts) garante que o servidor está no ar antes dos testes começarem (equivalente ao `pytest-django` que configura o banco antes de rodar).

```bash
npm test          # sobe serviços + migrações + next dev + jest
npm test:watch    # mesma coisa, mas recarrega quando você salva um arquivo
```

---

### ESLint + Prettier (= flake8 + black)

| Ferramenta Python                          | Equivalente JS |
| ------------------------------------------ | -------------- |
| `flake8` (verifica erros e style)          | `ESLint`       |
| `black` (formata o código automaticamente) | `Prettier`     |

```bash
npm run lint:eslint:check    # só verifica, não muda nada
npm run lint:prettier:check  # só verifica
npm run lint:prettier:fix    # formata tudo automaticamente
```

---

### Husky + Commitlint (= pre-commit hooks)

O **Husky** instala hooks do Git. Quando você faz um `git commit`, o Commitlint verifica se a mensagem segue o padrão **Conventional Commits**:

```
feat: adiciona endpoint de login
^     ^
|     +-- descrição em minúsculas, imperativo
+-- tipo: feat | fix | docs | refactor | test | chore
```

Se a mensagem estiver errada, o commit é **bloqueado**. Isso mantém o histórico do git limpo e legível.

---

## 2. O primeiro endpoint: `GET /api/v1/status`

**Arquivo:** [`pages/api/v1/status/index.ts`](../../pages/api/v1/status/index.ts)

No Django, isso seria uma view simples:

```python
# Django equivalente
def status(request):
    with connection.cursor() as cursor:
        cursor.execute("SHOW server_version;")
        version = cursor.fetchone()[0]
    return JsonResponse({"updated_at": now().isoformat(), "database": {"version": version}})
```

No Next.js com `next-connect`:

```typescript
// next-connect é um roteador minimalista para as API routes do Next.js
// Permite encadear middlewares, similar ao Express.js
const router = createRouter<NextApiRequest, NextApiResponse>();

router.get(async (req, res) => {
  const result = await database.query("SHOW server_version;");
  res.status(200).json({ version: result.rows[0].server_version });
});

// handler() aplica tratamento de erros central (nosso controller.ts)
export default router.handler(controller.errorHandlers);
```

**Teste:** [`tests/integration/api/v1/status/get.test.ts`](../../tests/integration/api/v1/status/get.test.ts)

```typescript
test("Retrieving current system status", async () => {
  // fetch() nativo do Node 24 — sem biblioteca extra
  const response = await fetch("http://localhost:3000/api/v1/status");
  expect(response.status).toBe(200); // assertEqual(response.status_code, 200)

  const body = await response.json();
  expect(body.dependencies.database.version).toBeDefined();
});
```

---

## 3. Estrutura de arquivos criados nesta fase

```
D:/projetos/cdf/
├── .editorconfig              # Configurações de editor (tabs vs spaces, etc.)
├── .env.development           # Variáveis de ambiente de dev (commitado, sem segredos)
├── .env.example               # Template das variáveis de produção (sem valores)
├── .eslintrc.json             # Configuração do ESLint
├── .gitignore                 # Arquivos ignorados pelo git
├── .husky/commit-msg          # Hook que valida mensagem de commit
├── .nvmrc                     # Versão do Node (24)
├── .prettierrc                # Configuração do Prettier
├── commitlint.config.js       # Regras dos Conventional Commits
├── jest.config.js             # Configuração do Jest
├── next-env.d.ts              # Tipos do Next.js (gerado automaticamente)
├── package.json               # = requirements.txt + setup.py + Makefile
├── tsconfig.json              # Configuração do TypeScript
├── infra/
│   ├── compose.yaml           # Docker Compose (banco, redis, mailcatcher)
│   ├── controller.ts          # Tratamento central de erros da API
│   ├── database.ts            # Pool de conexões PostgreSQL
│   ├── errors.ts              # Classes de erro customizadas
│   ├── migrations/            # Arquivos de migração do banco
│   └── scripts/
│       └── wait-for-postgres.ts  # Aguarda o banco estar pronto
├── pages/
│   └── api/v1/
│       └── status/index.ts    # GET /api/v1/status
└── tests/
    ├── orchestrator.ts        # Aguarda o servidor antes dos testes
    └── integration/api/v1/
        └── status/get.test.ts # Teste do endpoint de status
```

---

## 4. Critério de aceite (como saber que está funcionando)

```bash
# Todos os serviços sobem
npm run services:up

# O banco aceita conexões
npm run services:wait:database
# 🟢 Postgres is ready and accepting connections!

# O endpoint responde
curl http://localhost:3000/api/v1/status
# {"updated_at":"...","dependencies":{"database":{"version":"17.x","max_connections":100,...}}}

# O teste passa
npm test
# PASS tests/integration/api/v1/status/get.test.ts
# Tests: 1 passed, 1 total ✅
```
