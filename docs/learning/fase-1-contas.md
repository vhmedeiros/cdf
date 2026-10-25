# Fase 1 — Contas e Autenticação

> **Analogia geral:** No Django, você tem o sistema de auth pronto:
> `django.contrib.auth` com `User`, `login()`, `logout()`, `@login_required`...
> Aqui vamos construir tudo isso **do zero**, linha por linha. Parece mais
> trabalhoso, mas você vai entender exatamente o que o Django faz por baixo dos panos.

---

## 1. O problema: como saber quem está logado?

### A abordagem HTTP é "sem memória" (stateless)

O HTTP não tem memória. Cada requisição é independente — o servidor não sabe
que você fez a requisição anterior. Para "lembrar" que alguém está logado,
precisamos de um mecanismo de **sessão**.

### Duas abordagens comuns

**JWT (JSON Web Token)** — o token _contém_ as informações do usuário:

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.assinatura
                      ↑ {"userId": "123"} em base64
```

Vantagem: sem consulta ao banco a cada requisição.
Desvantagem: **não dá para invalidar** — se o token vazou, fica válido até expirar.

**Session Token (o jeito do curso)** — o token é apenas uma chave aleatória, os
dados ficam no banco:

```
cookie: session_id=a3f9...tok...aleat...orio
        ↓
banco:  sessions | token=a3f9... | user_id=123 | expires_at=...
```

Vantagem: para invalidar (logout, banir usuário), basta deletar a linha da tabela.
Desvantagem: consulta ao banco a cada requisição (mitigado com Redis no futuro).

> **No Django**, a sessão padrão funciona exatamente assim: `django.contrib.sessions`
> salva em tabela e manda um cookie `sessionid`. Estamos fazendo a mesma coisa,
> mas escrevendo cada parte.

---

## 2. Por que não tem cadastro público?

O CLAUDE.md define: **sem cadastro público**. Usuários entram por **convite**.

Isso é uma decisão de produto para uma plataforma privada. O fluxo é:

1. Admin cria um convite para um e-mail específico → gera um link único.
2. O usuário recebe o link, clica, define sua senha → conta criada.
3. O link expira e só pode ser usado uma vez.

> No Django isso seria um `OneTimeLink` com `used_at` e `expires_at` — mesma ideia.

---

## 3. Migrações — as tabelas que vamos criar

> [!NOTE] **Lembre-se:** migrações são como `makemigrations` + `migrate` do Django,
> mas escritas à mão. Cada arquivo tem `up()` (aplicar) e `down()` (reverter).

### Tabela `users`

```sql
-- O que o node-pg-migrate vai executar:
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,          -- hash bcrypt, nunca texto puro
  display_name TEXT NOT NULL,
  avatar_url  TEXT,
  features    TEXT[] NOT NULL DEFAULT '{}',  -- ex: ['read:course', 'create:note']
  preferences JSONB NOT NULL DEFAULT '{}',   -- tema, velocidade, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> **`UUID` vs `INTEGER`:** O Django usa `id` inteiro auto-incrementado por padrão.
> UUIDs (`gen_random_uuid()`) são gerados pelo banco sem ordem sequencial, o que
> evita que alguém adivinhe IDs de outros usuários (`/user/1`, `/user/2`...).

> **`TEXT[]` (array de texto):** PostgreSQL suporta arrays como tipo de coluna.
> Guardamos as _features_ (permissões) do usuário como `{read:course, create:note}`.
> No Django, isso seria uma `ManyToMany` para um modelo `Permission`.

> **`JSONB`:** JSON binário indexável no Postgres. As preferências do usuário
> (tema, velocidade do vídeo, etc.) são dados flexíveis — JSONB é perfeito para isso.

### Tabela `sessions`

```sql
CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token      TEXT UNIQUE NOT NULL,   -- vai para o cookie
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> **`ON DELETE CASCADE`:** Se deletarmos o usuário, todas as sessões dele são
> deletadas automaticamente. No Django seria `on_delete=models.CASCADE`.

### Tabela `invites`

```sql
CREATE TABLE invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  token       TEXT UNIQUE NOT NULL,  -- vai no link do e-mail
  features    TEXT[] NOT NULL DEFAULT '{}',
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,           -- NULL = não usado ainda
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Models — a camada de regras de negócio

No Django, um model é uma classe que herda de `models.Model`. Aqui, um model é
simplesmente **um arquivo TypeScript com funções que executam SQL**.

### `models/user.ts` — analogia Django

```python
# Django
class User(models.Model):
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)  # Django faz o hash interno

    @classmethod
    def create(cls, email, password):
        return cls.objects.create(email=email, password=make_password(password))

    @classmethod
    def find_by_email(cls, email):
        return cls.objects.filter(email=email).first()
```

```typescript
// Nossa versão em TypeScript — SQL puro
import bcrypt from "bcryptjs";
import database from "@/infra/database";

// Tipo TypeScript (= dataclass do Python com type hints obrigatórios)
export type User = {
  id: string;
  email: string;
  display_name: string;
  features: string[];
  created_at: Date;
};

async function create({ email, password, display_name }: CreateUserInput) {
  // Nunca guardamos a senha em texto puro — sempre hash
  const hashedPassword = await bcrypt.hash(password, 10);
  //                                              ↑ custo: 10 rodadas de hashing

  const result = await database.query<User>(
    `INSERT INTO users (email, password, display_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name, features, created_at`,
    [email, hashedPassword, display_name],
  );
  return result.rows[0];
}
```

> **`bcrypt.hash(password, 10)`:** O `10` é o "salt rounds" — quantas vezes o
> algoritmo roda. Mais rodadas = mais seguro, mas mais lento. 10 é o padrão
> recomendado: ~100ms de hash, impossível de bruteforçar.

---

## 5. Middlewares — injectAnonymousOrUser e canRequest

### No Django você tem:

```python
@login_required  # redireciona para login se não estiver autenticado
def minha_view(request):
    user = request.user  # já disponível após autenticação
    if not user.has_perm('app.can_do_thing'):
        return HttpResponseForbidden()
```

### Aqui fazemos na mão com dois middlewares:

**`injectAnonymousOrUser`** — lê o cookie e popula `req.context.user`:

```typescript
async function injectAnonymousOrUser(req, res, next) {
  // 1. Pega o token do cookie (se existir)
  const token = req.cookies?.session_id;

  if (!token) {
    req.context = { user: anonymousUser }; // usuário sem sessão
    return next();
  }

  // 2. Busca a sessão no banco
  const session = await Session.findByToken(token);

  if (!session || session.expires_at < new Date()) {
    req.context = { user: anonymousUser };
    return next();
  }

  // 3. Injeta o usuário real na requisição
  const user = await User.findById(session.user_id);
  req.context = { user };
  next();
}
```

**`canRequest(feature)`** — verifica permissão:

```typescript
function canRequest(feature: string) {
  return function (req, res, next) {
    const user = req.context.user;

    if (!user.features.includes(feature)) {
      throw new ForbiddenError(); // → 403 automaticamente pelo controller
    }

    next(); // segue para o handler
  };
}

// Uso numa rota de admin:
router.post(canRequest("create:course"), handler);
// Se o usuário não tiver "create:course" no array features → 403
```

---

## 6. Endpoints e o fluxo de login

### `POST /api/v1/sessions` — Login

Fluxo completo:

```
1. Usuário envia { email, password }
2. Validamos com zod (tipo e formato)
3. Buscamos o usuário pelo email no banco
4. Comparamos a senha com o hash: bcrypt.compare(senhaDigitada, hashDoBanco)
5. Se correto: geramos um token aleatório com crypto.randomBytes(96).toString('hex')
6. Salvamos na tabela sessions com expires_at = agora + 30 dias
7. Colocamos o token no cookie:
   res.setHeader('Set-Cookie', 'session_id=TOKEN; HttpOnly; Secure; SameSite=Lax')
8. Respondemos 201 com os dados públicos do usuário (sem senha!)
```

> **`HttpOnly`:** JavaScript da página **não consegue** ler o cookie. Proteção contra XSS.
> **`SameSite=Lax`:** Proteção básica contra CSRF — o cookie só vai em navegações do mesmo site.

### `DELETE /api/v1/sessions` — Logout

```
1. Pega o token do cookie
2. Deleta a linha da tabela sessions
3. Remove o cookie (seta com data de expiração no passado)
4. Responde 200
```

---

## 7. Rate Limiting — proteção contra força bruta

> **Analogia:** É como um porteiro que conta quantas vezes alguém tentou entrar errado.
> Após 5 erros, bloqueia por alguns minutos.

Implementação com Redis:

```typescript
// A cada tentativa de login com senha errada:
const key = `login_attempts:${email}`; // chave única por email
const attempts = await redis.incr(key); // incrementa o contador
await redis.expire(key, 60 * 15); // expira em 15 minutos

if (attempts >= 5) {
  throw new TooManyRequestsError(); // → 429
}
```

> **Por que Redis e não o Postgres?** O Redis é um banco em memória com suporte
> nativo a expiração de chaves (TTL). Perfeito para dados temporários como
> contadores de tentativas. No Django, isso seria feito com `django-axes` ou
> manual com `django.core.cache`.

---

## 8. Zod — validação de entrada

> **Analogia:** É como os `serializers` do Django REST Framework. Define o formato
> esperado dos dados e valida automaticamente.

```typescript
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
});

// Na rota:
const parsed = LoginSchema.safeParse(req.body);
if (!parsed.success) {
  throw new ValidationError({ message: parsed.error.issues[0].message });
}
const { email, password } = parsed.data; // TypeScript sabe o tipo exato aqui!
```

---

## 9. Estrutura de arquivos criados nesta fase

```
D:/projetos/cdf/
├── infra/
│   ├── migrations/
│   │   ├── 1_create-users.ts       # Cria tabela users
│   │   ├── 2_create-sessions.ts    # Cria tabela sessions
│   │   └── 3_create-invites.ts     # Cria tabela invites
│   └── redis.ts                    # Conexão com Redis (para rate-limit)
├── models/
│   ├── user.ts                     # create, findByEmail, findById
│   ├── session.ts                  # create, findByToken, deleteByToken
│   └── invite.ts                   # create, findByToken, markAsUsed
├── pages/api/v1/
│   ├── sessions/
│   │   └── index.ts                # POST (login) e DELETE (logout)
│   ├── user/
│   │   └── index.ts                # GET (quem sou eu?)
│   ├── invites/
│   │   └── [token].ts              # GET (ver convite) e PATCH (aceitar)
│   └── password-resets/
│       ├── index.ts                # POST (solicitar reset)
│       └── [token].ts              # PATCH (redefinir senha)
└── tests/integration/api/v1/
    ├── sessions/
    │   └── post.test.ts            # login, erros, rate-limit
    ├── user/
    │   └── get.test.ts             # retorna usuário logado
    └── invites/[token]/
        └── patch.test.ts           # convite de uso único
```

---

## 10. Critério de aceite (como saber que está funcionando)

```bash
npm test
# ✅ Login com credenciais corretas → 201 + cookie
# ✅ Login com senha errada → 401
# ✅ 5 erros de login → 429 (bloqueado)
# ✅ Convite aceito → conta criada
# ✅ Convite usado segunda vez → 410 Gone
# ✅ Rota de admin sem feature admin → 403
# ✅ Rota de aluno sem matrícula → 403
```

---

_Atualizado em: 25/10/2026_
