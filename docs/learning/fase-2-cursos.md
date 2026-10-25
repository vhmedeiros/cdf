# Fase 2 — Cursos e Integração com o Google Drive

> **Analogia geral:** No Django, quando você tem uma hierarquia de conteúdo,
> você cria modelos com `ForeignKey`: `Course -> Module -> Lesson -> Material`.
> Para tarefas demoradas como sincronizar com uma API externa, você usa **Celery + Redis**.
> Aqui fazemos exatamente isso, usando **PostgreSQL puro**, a biblioteca **BullMQ**
> para filas no Node.js e uma função pura para organizar a árvore.

---

## 1. O Conceito Central: Drive como "Storage", Plataforma como "Experiência"

A proposta do projeto é inovadora: **o dono não precisa fazer upload de gigabytes de vídeo no servidor**.

- Os vídeos, PDFs e áudios ficam organizados nas pastas do Google Drive.
- A plataforma lê a estrutura do Drive via API (usando uma Service Account do Google) e constrói a árvore de estudo no PostgreSQL.
- Os alunos assistem e leem pela plataforma, que guarda o progresso, notas e tempo.

---

## 2. Modelagem Relacional (O Schema do Curso)

No Django, você escreveria:

```python
# Django equivalente
class Course(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    drive_folder_id = models.CharField(max_length=255)
    total_duration_seconds = models.PositiveIntegerField(default=0)

class Module(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    position = models.PositiveIntegerField()

class Lesson(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    position = models.PositiveIntegerField()

class Material(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='materials')
    drive_file_id = models.CharField(max_length=255, unique=True)
    kind = models.CharField(max_length=20, choices=[('video', 'Vídeo'), ('pdf', 'PDF')...])
```

Na migração [`infra/migrations/5_create-courses-schema.ts`](../../infra/migrations/5_create-courses-schema.ts),
criamos exatamente essa estrutura com SQL nativo do Postgres, com índices compostos `(course_id, position)` para garantir que a ordenação seja instantânea.

---

## 3. O Segredo da Arquitetura: A Função Pura `buildTree`

> [!NOTE] **O que é uma função pura?**
> Uma função pura é aquela que:
>
> 1. Dada a mesma entrada, sempre retorna o mesmo resultado.
> 2. **Não tem efeitos colaterais** (não acessa banco de dados, não faz requisições HTTP, não lê o disco).

Em vez de misturar chamadas da API do Google Drive com inserções no banco, isolamos a inteligência de organização em uma função pura: [`services/drive/buildTree.ts`](../../services/drive/buildTree.ts).

### O que ela faz:

1. Recebe uma lista de arquivos e pastas retornada pelo Drive.
2. Identifica o Nível 1 como **Módulos**.
3. Aplica a **estratégia de agrupamento**:
   - `folders`: cada subpasta do módulo é uma aula.
   - `files`: cada vídeo inicia uma aula, e os PDFs/áudios seguintes são anexados a ela.
   - `auto`: usa `folders` se houver subpastas, senão `files`.
4. Aplica **ordenação natural**:
   - Ordenação comum: `"001."`, `"010."`, `"002."` (o `010` viria antes do `002`).
   - Ordenação natural: `"001."`, `"002."`, ..., `"010."` (ordem humana correta).
5. **Limpeza de nomes**:
   - `"001. Introdução ao Curso.mp4"` vira título limpo: `"Introdução ao Curso"`.
6. **Ignora o player antigo**:
   - Arquivos como `index.html`, `script.js`, `style.css` e pastas que só contenham esses arquivos são descartados automaticamente.

### Por que isso é tão poderoso para testes?

Podemos criar arquivos JSON de exemplo (fixtures) simulando cursos reais e testar centenas de casos de borda no Jest em **milissegundos**, sem precisar de internet ou credenciais do Google!

---

## 4. Tarefas Assíncronas: BullMQ (= Celery no Django)

| Django / Python | Node.js / TypeScript | Função                                            |
| --------------- | -------------------- | ------------------------------------------------- |
| **Celery**      | **BullMQ**           | Gerenciador de filas e tarefas em segundo plano   |
| **Redis**       | **Redis**            | Broker de mensagens (onde a fila fica armazenada) |
| `tasks.py`      | `worker/jobs/*.ts`   | Onde a lógica do job assíncrono é implementada    |
| `celery worker` | `npm run worker:dev` | O processo separado que consome a fila            |

### Por que não sincronizar direto na rota da API?

Uma pasta de curso com 50 aulas e 200 vídeos pode demorar 10 a 30 segundos para ser lida e processada no Google Drive.
Se fizéssemos isso direto no endpoint HTTP:

1. A requisição do navegador poderia dar timeout (504).
2. O servidor ficaria bloqueado sem atender outros usuários.

Com **BullMQ**:

1. O admin clica em "Sincronizar".
2. A API apenas enfileira o job `syncCourse({ courseId })` no Redis e responde `202 Accepted` em 5ms.
3. O **Worker** pega o job da fila, sincroniza tranquilamente e atualiza o status em `sync_runs`.
4. A tela do admin faz polling via SWR a cada 2s para mostrar a barra de progresso.

---

## 5. Seed de Dados Offline (= fixtures do Django)

Para você poder desenvolver e testar a interface sem precisar configurar uma Service Account do Google Drive no primeiro dia, criamos o script `npm run seed`:

- Cria um usuário administrador padrão (`admin@aula.local` / `senha123456`).
- Cria um curso completo de exemplo com módulos, aulas e materiais fictícios usando `@faker-js/faker`.
- Matricula o usuário no curso para você já ver como aluno.
