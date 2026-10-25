# 💡 Descobertas de Arquitetura e Lições Práticas

Este documento reúne os desafios reais, armadilhas (_gotchas_) e soluções arquiteturais encontrados durante o desenvolvimento do projeto, explicados com analogias para quem vem do ecossistema Django.

---

## 1. O Problema do Vazamento de Conexões (_Connection Leak_) e Pool vs Client no Jest

### O que aconteceu no teste:

Nosso teste do endpoint `GET /api/v1/status` falhou esperando `opened_connections = 1`, mas recebeu `5`. Além disso, o Jest exibiu o aviso:

```
Jest did not exit one second after the test run has completed.
This usually means that there are asynchronous operations that weren't stopped in your tests.
```

### Por que isso aconteceu?

Inicialmente, configuramos `infra/database.ts` usando um `Pool` do `pg`:

```typescript
const pool = new Pool({ max: 20, idleTimeoutMillis: 30000 });
```

1. Quando outros testes rodaram antes do teste de status, o `Pool` abriu conexões com o Postgres e as manteve abertas em modo _idle_ (espera).
2. O endpoint `/status` conta quantas conexões existem no banco (`SELECT count(*)::int FROM pg_stat_activity WHERE datname = $1`). Ele viu as conexões inativas do pool e acusou 5 conexões abertas.
3. Como o `Pool` mantém _sockets_ TCP abertos com timers ativos aguardando novas queries, o Jest detectou operações assíncronas pendentes (_open handles_) e ficou travado sem encerrar.

### Analogia com Django:

- No Django, o `settings.py` possui `CONN_MAX_AGE` (por padrão `0`, fechando a conexão ao final de cada request).
- Nos testes (`django.test.TestCase`), o Django fecha as conexões automaticamente ao desmontar o ambiente de teste.
- No Node.js puro sem ORM, **você é o responsável pelo ciclo de vida da conexão**.

### A Solução do curso.dev:

No curso.dev, a função utilitária `query()` cria um cliente sob demanda e **garante** seu encerramento no bloco `finally`:

```typescript
async function query(queryText: string, values?: any[]) {
  let client: Client | undefined;
  try {
    client = await getNewClient();
    return await client.query(queryText, values);
  } finally {
    await client?.end(); // Encerra o socket imediatamente!
  }
}
```

**Resultado:** Zero conexões presas, `opened_connections` sempre preciso e o Jest encerra na hora.

---

## 2. Como Evitar o Problema N+1 ao Carregar Árvores de Curso

### O que é o Problema N+1?

Se um curso tem 10 módulos e cada módulo tem 5 aulas, uma implementação ingênua faria:

1. `SELECT * FROM courses WHERE id = ...` (1 query)
2. Para cada módulo: `SELECT * FROM lessons WHERE module_id = ...` (10 queries)
3. Para cada aula: `SELECT * FROM materials WHERE lesson_id = ...` (50 queries)
   Total: **61 consultas ao banco de dados** para abrir uma única página de curso!

### Analogia com Django:

No Django ORM, você resolveria isso com `prefetch_related`:

```python
Course.objects.prefetch_related('modules__lessons__materials').get(slug=slug)
```

Por baixo dos panos, o Django faz 4 consultas no total usando cláusulas `WHERE id IN (...)`.

### Como fizemos em SQL Puro no Node.js ([models/course.ts](../../models/course.ts)):

Fazemos exatamente o mesmo que o Django faz, mas escrevendo o SQL explicitamente:

1. **Query 1:** Busca o curso e seus módulos ordenados:
   ```sql
   SELECT id, title, position FROM modules WHERE course_id = $1 AND is_active = true ORDER BY position ASC;
   ```
2. **Query 2:** Busca as aulas de **todos** os módulos de uma vez só usando o operador de array do Postgres:
   ```sql
   SELECT id, module_id, title, position, duration_seconds FROM lessons WHERE module_id = ANY($1::uuid[]) AND is_active = true ORDER BY position ASC;
   ```
3. **Query 3:** Busca os materiais de **todas** as aulas em lote:
   ```sql
   SELECT id, lesson_id, drive_file_id, title, kind, mime, size_bytes, duration_seconds, position FROM materials WHERE lesson_id = ANY($1::uuid[]) AND is_active = true ORDER BY position ASC;
   ```
4. **Agrupamento em Memória:** Usamos `Map` do JavaScript para montar a árvore hierárquica em milissegundos.

**Resultado:** A árvore inteira é montada em **apenas 3 queries fixas**, independentemente de o curso ter 10 ou 1.000 aulas.

---

## 3. Streaming de Vídeo por HTTP e o Header `Range` (Seek de Vídeo)

### Como um player de vídeo realmente funciona?

Um arquivo de vídeo de 1 hora pode ter 1GB. O navegador **não baixa o arquivo inteiro** antes de começar a tocar.

1. **Início:** O player pede os primeiros bytes para ler o cabeçalho (_moov atom_):
   ```http
   GET /api/v1/stream/uuid
   Range: bytes=0-1048575
   ```
2. **Resposta:** O servidor devolve apenas aquele pedaço com o status **`206 Partial Content`**:
   ```http
   HTTP/1.1 206 Partial Content
   Accept-Ranges: bytes
   Content-Range: bytes 0-1048575/1073741824
   Content-Length: 1048576
   Content-Type: video/mp4
   ```
3. **O Seek:** Quando o aluno pula a barra de tempo para a metade do vídeo, o navegador cancela o download atual e envia um novo Range:
   ```http
   Range: bytes=524288000-525336575
   ```
   Se o seu backend responder `200 OK` em vez de `206 Partial Content`, o player não consegue pular para frente sem baixar tudo antes.

### Por que desligar o `bodyParser` do Next.js?

Por padrão, o Next.js tenta carregar todo o payload de requisições e respostas na memória RAM (com limite de 4MB).
Para que o streaming funcione como um tubo contínuo (_stream pipeline_), é obrigatório adicionar no topo do arquivo do endpoint:

```typescript
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
```

---

## 4. A Técnica do `X-Accel-Redirect` (Next.js Autoriza, Nginx Transmite)

### O Problema:

Transmitir 1GB de vídeo pelo processo do Node.js consome CPU, memória e satura o _event loop_, diminuindo a quantidade de usuários que o servidor aguenta simultaneamente.

### A Solução:

Usamos a diretiva `X-Accel-Redirect` do Nginx (análogo ao `django-sendfile` ou `X-Sendfile` do Apache):

1. O aluno faz a requisição normal para o Next.js: `GET /api/v1/stream/[id]`.
2. O Next.js verifica no banco se o aluno está matriculado (`EnrollmentModel.isEnrolled`).
3. Se autorizado, o Next.js responde **em 2ms com corpo vazio** e o cabeçalho:
   ```http
   X-Accel-Redirect: /_drive/ID_DO_ARQUIVO_NO_GOOGLE_DRIVE
   X-Drive-Token: TOKEN_SECRETO_DA_SERVICE_ACCOUNT
   ```
4. O Nginx intercepta essa resposta. O bloco `location /_drive/` é marcado como `internal;` (ninguém consegue chamá-lo diretamente da internet).
5. O Nginx faz o proxy direto para os servidores do Google Drive e transmite os bytes para o usuário, repassando o `Range`.
6. O Node.js é liberado imediatamente para atender o próximo aluno!

---

## 5. Por que usar Função Pura para a Lógica do Drive (`buildTree`)?

### O Problema:

Geralmente desenvolvedores misturam a leitura da API do Google Drive com as queries de banco no mesmo método.
Isso torna os testes lentos, frágeis e dependentes de internet ou mocks complexos de rede.

### A Solução:

Separamos em duas partes:

1. **I/O de Rede (`services/drive/client.ts`):** Apenas baixa a lista crua de arquivos do Drive.
2. **Função Pura (`services/drive/buildTree.ts`):** Recebe a lista de arquivos em memória e devolve a árvore estruturada.

Por ser uma função pura (sem banco, sem rede), conseguimos criar uma suíte com dezenas de testes no Jest que rodam em **0.3 segundos**, testando estratégias de módulos, remoção de prefixos numéricos e ordenação natural.
