# Fase 6: Engajamento & Produtividade (Home "Continuar", Paleta Ctrl+K, Busca com Unaccent, Streak/Heatmap e Revisão Espaçada)

Bem-vindo ao guia da **Fase 6**! Se até a Fase 5 tínhamos uma sala de aula e um caderno de estudos completos, a Fase 6 transforma a plataforma no seu **painel central de rotina de estudos**:

1. **Dashboard Home Inteligente ("Continuar Assistindo")**:
   - Um card de destaque detecta instantaneamente a última aula assistida e calcula o segundo exato onde você parou, oferecendo um botão de retomada imediata (`▶ Retomar em 14:22`).
   - Cards dos cursos com número de materiais, status e acesso direto.
2. **Paleta de Comandos Global (`Ctrl+K` / `Cmd+K`)**:
   - Paleta estilo Raycast/Linear baseada em `cmdk`.
   - Permite buscar qualquer aula, curso ou anotação pessoal, além de disparar ações imediatas (_"Alternar Modo Foco"_, _"Ir para Início"_, _"Meus Cursos"_).
3. **Busca Full-Text Insensível a Acentos com `unaccent` (`GET /api/v1/search?q=`)**:
   - Extensão nativa do PostgreSQL que normaliza diacríticos. Se o usuário pesquisar _"prescricao"_, o sistema encontra anotações e aulas contendo _"prescrição"_.
   - Busca segura e isolada por usuário nas anotações pessoais.
4. **Sistema de Revisão Espaçada (Spaced Repetition)**:
   - Ao concluir uma aula (progresso ≥ 90%), o banco agenda automaticamente revisões em **1 dia (D+1)**, **7 dias (D+7)** e **30 dias (D+30)** na tabela `reviews`.
   - A Home exibe a fila de revisões que venceram hoje, com botão para revisar o conteúdo ou marcar como concluída.
5. **Ofensiva Diária (Streak) & Mapa de Calor (Heatmap estilo GitHub)**:
   - Tabela `study_days` agregando segundos estudados e aulas concluídas por dia.
   - Cálculo determinístico de ofensiva contínua (`🔥 X dias seguidos`) e maior sequência histórica.
   - Grid de calor visual com 20 semanas destacando a constância e intensidade dos estudos.
6. **Modo Foco (`Shift+F`) e PWA Instalável**:
   - Modo foco que oculta menus, barras laterais e cabeçalho, deixando apenas o player e o Pomodoro na tela.
   - `manifest.json` e Service Worker (`sw.js`) configurados para permitir instalar a aplicação no computador ou celular, sem cachear vídeos.

---

## 1. Analogias com o Django

### A) Busca com `unaccent`: PostgreSQL vs Django ORM

No Django, para realizar buscas ignorando acentuação, você precisaria:

1. Adicionar `'django.contrib.postgres'` aos `INSTALLED_APPS`.
2. Rodar uma migração com `UnaccentExtension()`.
3. Usar lookups como `Note.objects.filter(body__unaccent__icontains=query)`.

No nosso projeto com Node.js + PostgreSQL puro:

- Criamos a extensão diretamente na migração SQL `7_create-engagement-schema.ts`:
  ```sql
  CREATE EXTENSION IF NOT EXISTS unaccent;
  ```
- E na consulta SQL de `models/search.ts`:
  ```sql
  WHERE unaccent(lower(body)) LIKE unaccent(lower('%' || $1 || '%'))
  ```
  Isso garante compatibilidade imediata com caracteres da língua portuguesa (ex: "Administração", "Direito Constitucional", "Jurisdição").

---

### B) Revisão Espaçada: Triggers de Progresso vs Tarefas do Celery

No ecossistema Django, era comum agendar revisões criando periodic tasks com Celery Beat ou disparando jobs no Redis.

No entanto, para o aluno que conclui uma aula, o agendamento de revisão é um **fato transacional determinístico**:

- Ao bater 90% da aula em `models/progress.ts`, uma transação insere três linhas na tabela `reviews` com datas relativas (`now() + 1 day`, `now() + 7 days`, `now() + 30 days`).
- Usamos `ON CONFLICT (user_id, material_id, stage) DO NOTHING` para evitar duplicações se o usuário reassistir a mesma aula.
- Nenhuma fila externa pesada é necessária para agendamento; a consulta `WHERE due_date <= now() AND done_at IS NULL` recupera instantaneamente o que vence hoje.

---

### C) Sequência de Estudos (Streak) e Heatmap

Em vez de recalcular todo o log de requisições ou somar toda a tabela de progresso a cada carregamento da página:

- Criamos a tabela agregada `study_days (user_id, date, seconds, materials_completed)`.
- Toda vez que o aluno assiste à aula (heartbeat) ou conclui um material, fazemos um upsert somando os segundos do dia.
- O endpoint `/api/v1/me/stats` recupera em uma única query leve o mapa dos últimos 365 dias e a sequência de dias consecutivos.

---

## 2. Critérios de Aceite Verificados

- **Busca Insensível a Acentos**: Testada e aprovada em `tests/integration/api/v1/search/search.test.ts` (pesquisar "prescricao" localiza anotações sobre "prescrição e decadência").
- **Agendamento e Conclusão de Revisões**: Testado e aprovado em `tests/integration/api/v1/reviews/reviews.test.ts`.
- **Estatísticas e Ofensiva**: Testado e aprovado em `tests/integration/api/v1/reviews/reviews.test.ts` e `tests/integration/pages/home.test.ts`.
- **100% dos Testes Automatizados Verdes**.
