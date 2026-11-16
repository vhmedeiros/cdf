# Problemas e Decisões a Resolver

> Documento vivo de pendências do projeto. Reúne decisões de produto, bloqueadores de produção, dívidas técnicas e lacunas de implementação.
>
> Atualizado em **2026-11-16**. Referências complementares: [`panorama-do-projeto.md`](./panorama-do-projeto.md) e [`infraestrutura-vm.md`](./infraestrutura-vm.md).

---

## 1. Como usar este documento

| Código      | Significado                                                                             |
| ----------- | --------------------------------------------------------------------------------------- |
| **P0**      | Bloqueador. Resolver antes do próximo deploy relevante ou antes de abrir para usuários. |
| **P1**      | Alta prioridade. Próximo ciclo de desenvolvimento.                                      |
| **P2**      | Melhoria ou dívida tolerável no curto prazo.                                            |
| **Decisão** | Depende de definição do dono do produto.                                                |
| **Técnico** | Depende de implementação no código/infra.                                               |

Regra de trabalho: itens **P0** não devem competir com novas funcionalidades. Itens de produto devem ser decididos antes de investir em implementação que dependa deles.

---

## 2. Resumo executivo

| ID      | Item                                                   | Tipo         | Prioridade |
| ------- | ------------------------------------------------------ | ------------ | ---------- |
| PROD-01 | Definir nome definitivo da plataforma                  | Decisão      | P1         |
| PROD-02 | Definir domínio oficial                                | Decisão      | P1         |
| PROD-03 | Definir modelo de operação: fechado ou comercial       | Decisão      | P0         |
| PROD-04 | Configurar SMTP transacional de produção               | Infra        | P0         |
| PROD-05 | Configurar monitoramento com Sentry                    | Infra        | P2         |
| PROD-06 | Fechar taxonomia inicial de disciplinas e assuntos     | Conteúdo     | P1         |
| PROD-07 | Definir bancas prioritárias do importador              | Conteúdo     | P1         |
| PROD-08 | Formalizar diretriz de direitos autorais das questões  | Política     | P0         |
| PROD-09 | Gerar e configurar a chave Gemini                      | IA           | P1         |
| PROD-10 | Editar nome e descrição dos cursos                     | Produto      | P1         |
| PROD-11 | Busca, filtro e paginação de cursos                    | Produto      | P1         |
| PROD-12 | Categorias de cursos                                   | Produto      | P1         |
| PROD-13 | Métricas de produto e comportamento                    | Produto      | P2         |
| TECH-01 | Reconciliar a branch `feat/questions` com a `main`     | Git/entrega  | P0         |
| TECH-02 | Corrigir os 4 erros atuais de typecheck                | Qualidade    | Concluído  |
| TECH-03 | Implementar verificação de `Origin`/CSRF nas mutações  | Segurança    | P0         |
| TECH-04 | Armazenar tokens de sessão, convite e reset como hash  | Segurança    | P1         |
| TECH-05 | Confirmar qual commit está em produção na VM           | Operação     | Concluído  |
| TECH-06 | Validar streaming real com volume de cache e Nginx     | Infra        | P0         |
| TECH-07 | Alinhar `CLAUDE.md` ao que realmente está implementado | Documentação | P1         |
| TECH-08 | Implementar sync incremental do Drive                  | Drive        | P1         |
| TECH-09 | Implementar testes das rotas administrativas e erros   | Qualidade    | P1         |
| TECH-10 | Concluir a fase 10: ingestão de provas em PDF          | Questões     | P1         |
| TECH-24 | Melhorar player e reprodução no mobile                 | Experiência  | P1         |
| TECH-25 | Corrigir scroll da sidebar de aulas no mobile          | Bug          | P1         |
| TECH-26 | Robustez do preview/sync do Drive                      | Drive        | P0         |
| TECH-27 | Pipeline 720p e variantes de mídia                     | Mídia        | P1         |
| TECH-28 | Otimizações e teste de velocidade do streaming         | Mídia        | P1         |
| TECH-29 | Plano de capacidade para 20 simultâneos e 5 TB         | Infra        | P1         |
| TECH-30 | Normalizar containers e validar mídia do Drive         | Mídia        | P1         |

---

## 3. Decisões de produto

### PROD-01 — Nome definitivo da plataforma

- **Contexto:** o projeto usa o codinome **“Aula”** e, internamente, **“CDF”**.
- **Afeta:** `<title>` das páginas, logo, favicon, manifest PWA, e-mails de convite, identidade visual e documentação.
- **Ação:** definir o nome comercial/oficial e aplicar em toda a aplicação.
- **Critério de aceite:** nenhuma referência visual ou textual ao codinome provisório nas telas públicas.
- **Prioridade:** P1.

### PROD-02 — Domínio oficial de acesso

- **Contexto:** a VM e o proxy Caddy estão configurados temporariamente para `aula.vhmedeiros.dev.br`.
- **Afeta:** DNS no Registro.br/Cloudflare, certificado TLS, `WEBSERVER_ORIGIN` e links de convite/reset.
- **Ação:** decidir se mantém o subdomínio atual ou aponta um domínio definitivo.
- **Critério de aceite:** domínio estável, HTTPS válido e `WEBSERVER_ORIGIN` atualizado em produção.
- **Prioridade:** P1.

### PROD-03 — Modelo de operação

- **Uso próprio/grupo fechado:**
  - foco em estudos pessoais e convidados;
  - pode operar com a cota gratuita do Gemini;
  - dispensa gateway de pagamento e termos comerciais complexos.
- **Comercial:**
  - exige plano pago de IA com teto de gastos;
  - exige gateway de pagamento, nota fiscal, Termos de Uso e Política de Privacidade/LGPD;
  - aumenta a exigência de disponibilidade, suporte e segurança.
- **Ação:** definir o modelo antes de investir em cobrança, escalabilidade ou conteúdo de terceiros.
- **Prioridade:** P0.

### PROD-06 — Taxonomia inicial de disciplinas e assuntos

- **Contexto:** hoje existem cadastradas:
  - Direito Constitucional;
  - Direito Administrativo;
  - Língua Portuguesa;
  - Raciocínio Lógico;
  - Programação e Backend Java.
- **Ação:** listar as próximas disciplinas e tópicos prioritários, por exemplo: Direito Penal, Informática, Administração Geral, Contabilidade, Direito Tributário e Legislação.
- **Critério de aceite:** taxonomia mínima aprovada e cadastrada via seed ou painel admin.
- **Prioridade:** P1.

### PROD-07 — Bancas prioritárias

- **Contexto:** já cadastradas: Cebraspe, FGV, FCC e Vunesp.
- **Ação:** definir quais bancas o importador deve suportar primeiro, por exemplo: Cesgranrio, Instituto AOCP, Quadrix, Selecon e IBFC.
- **Critério de aceite:** lista ordenada por prioridade e coberta pelo parser da fase 10.
- **Prioridade:** P1.

### PROD-08 — Direitos autorais das questões

- **Regra inegociável:** usar **apenas provas e gabaritos oficiais públicos** disponibilizados pelas bancas e órgãos.
- **Proibição:** nunca raspar sites comerciais de questões (QConcursos, TecConcursos etc.), pois comentários, formatação e curadoria dessas plataformas são protegidos.
- **Ação:** manter essa regra registrada no fluxo de importação e na revisão de conteúdo.
- **Prioridade:** P0 (política).

### PROD-09 — Chave definitiva da API Gemini

- **Contexto:** o roteador de IA, o controle de cota no Redis, o fallback entre modelos e o circuit breaker já existem na branch `feat/questions`.
- **Ação:** gerar uma única chave no Google AI Studio e configurar `GEMINI_API_KEY` quando as explicações e o coach forem ativados.
- **Observação:** não implementar rotação de chaves ou múltiplas contas para burlar cota; isso viola os termos do Google e coloca em risco a conta que hospeda o Drive.
- **Prioridade:** P1.

### PROD-10 — Editar nome e descrição dos cursos

- **Contexto:** o admin só consegue excluir, publicar/despublicar e sincronizar cursos. Não existe `PATCH` nem edição de título/descrição.
- **Ação:** criar `PATCH /api/v1/admin/courses/[id]` para título, descrição e, se necessário, slug; adicionar modal de edição no painel admin.
- **Cuidado:** alterar o slug quebra links e matrículas antigas; se permitido, manter histórico/redirect.
- **Critério de aceite:** editar título e descrição reflete no catálogo e na sala de aula sem exigir novo sync.
- **Prioridade:** P1.

### PROD-11 — Busca, filtro e paginação de cursos

- **Contexto:** o painel admin busca apenas alunos (`studentSearch`); a lista de cursos carrega todos os registros de uma vez.
- **Ação:** adicionar `q`, `status`, `category`, `page` e `limit` na API/admin e os controles correspondentes na UI. Aplicar o mesmo padrão ao catálogo do aluno.
- **Critério de aceite:** buscar por título/slug, filtrar por status/categoria e navegar por páginas sem carregar o acervo inteiro.
- **Prioridade:** P1.

### PROD-12 — Categorias de cursos

- **Contexto:** a taxonomia atual (`subjects`) organiza questões, não cursos. Não há categoria de curso no schema.
- **Ação:** definir categoria única ou múltipla; criar tabela/campo, seed inicial (ENEM, concursos, programação, inglês etc.), filtros no admin e no catálogo.
- **Decisão pendente:** categoria única ou N:N; categorias fixas ou editáveis pelo admin.
- **Prioridade:** P1.

### PROD-13 — Métricas de produto e comportamento

- **Contexto:** `PROD-05` cobre apenas erros com Sentry. Não há métricas de uso, retenção ou comportamento no player.
- **Ação:** para o volume atual (20 usuários), começar com consultas SQL e painel admin: usuários totais/ativos, matrículas, aulas iniciadas/concluídas, tempo assistido, última atividade, dispositivo e falhas de sync/streaming. Se precisar de funil/sessão, usar PostHog Cloud (camada gratuita) ou Umami self-hosted.
- **Cuidado:** LGPD/consentimento, anonimização de IP e retenção limitada; não capturar conteúdo de anotações ou dados sensíveis.
- **Prioridade:** P2.

---

## 4. Infraestrutura e operação

### PROD-04 — SMTP transacional de produção

- **Contexto:** em desenvolvimento o Mailcatcher intercepta os e-mails em `localhost:1080`.
- **Afeta:** convites de alunos, recuperação e redefinição de senha.
- **Ação:** contratar ou configurar um provedor (Resend, Brevo, SendGrid, Amazon SES ou Gmail com senha de app) e preencher `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD` e `EMAIL_FROM` no `.env.production`.
- **Critério de aceite:** convite e reset chegam em uma caixa real; falhas de envio são registradas.
- **Prioridade:** P0.

### PROD-05 — Monitoramento com Sentry

- **Contexto:** `SENTRY_DSN` já está previsto no `.env.example`, mas não há integração ativa.
- **Afeta:** erros no browser, no Next.js e no worker.
- **Ação:** criar projeto no Sentry e configurar o DSN. Opcional para o uso inicial, recomendado antes de abrir para mais usuários.
- **Prioridade:** P2.

### TECH-05 — Confirmar o commit em produção (concluído)

- **Contexto:** a `main` está em `6036f64`, e a VM foi confirmada no mesmo commit.
- **Status:** confirmado em 2026-11-16: `HEAD`, `origin/main` e `origin/HEAD` em `6036f64`; working tree limpo.
- **Critério de aceite:** commit de produção documentado e deploy reproduzível.
- **Prioridade:** Concluído.

### TECH-06 — Validar streaming no ambiente real

- **Contexto:** o fluxo de produção depende do volume compartilhado `cdf_prod_media`, do `alias /var/cache/media/` no Nginx e do cache LRU em disco. Em 2026-11-16 foram validados `206`, cache quente e a correção do service worker; ainda faltam PDF inline, áudio, seek em mobile e limpeza do LRU.
- **Riscos:** cache vazio no primeiro acesso, permissões do volume, range requests quebrados, cache crescendo sem controle e divergência entre `STREAM_MODE=node` e `nginx`.
- **Ação:** testar vídeo grande com seek, PDF inline, áudio, primeiro acesso e acesso repetido; confirmar HTTP 206, `Content-Range` e limpeza do LRU.
- **Critério de aceite:** seek funciona no desktop e no celular; cache é preenchido e limpo corretamente; token do Drive não aparece no navegador.
- **Prioridade:** P0.

### TECH-27 — Pipeline 720p e variantes de mídia

- **Decisão:** todo vídeo deve ser servido em **720p** por padrão, para reduzir o consumo de dados e o egress.
- **Contexto:** a API do Google Drive entrega o arquivo original; não existe parâmetro de resolução. Portanto, “tocar em 720p” só reduz banda se existir uma variante 720p transcodificada. Redimensionar no CSS/player não reduz o download.
- **Infra:** Google Drive Pro com **5 TB** (cerca de 2 TB de cursos, ~3 TB livres). O restante da stack é gratuito (Oracle Always Free, Postgres, Redis, Nginx/Caddy), mas o egress do Oracle tem limite mensal.
- **Ação:** gerar proxy 720p H.264/AAC com `-movflags +faststart`, bitrate aproximado de 1,5–2,5 Mbps e áudio 96–128 kbps. Mapear `material -> variante` (tabela `media_variants` ou campo `stream_drive_file_id`), usar o proxy no streaming e manter o original como arquivo/fallback. Transcodificar sob demanda no worker, com fila e concorrência 1–2; não transcodificar o que já é ≤720p e compatível. Antes de decidir, rodar `ffprobe` e normalizar o container: arquivos TS/MKV renomeados como `.mp4` devem ser remuxados para MP4 faststart.
- **Critério de aceite:** o player recebe 720p; consumo cai para ~0,7–1,1 GB por hora; original preservado; seek e mobile continuam funcionando.
- **Prioridade:** P1.

### TECH-28 — Otimizações e teste de velocidade do streaming

- **Contexto:** no primeiro play, o código transmite do Drive e também baixa o arquivo inteiro em background para o cache, duplicando tráfego. O Nginx já tem `proxy_buffering off` para a rota de stream e o cache local tem teto de 50 GB. A segunda medição mostrou downloads integrais (`200`) de 53–126 MB vindos do cache local e Range Requests (`206`) frios a 4–22 Mbps. O service worker cacheava HTML/chunks com cache-first e podia manter o bundle antigo; o branch de cache do Nginx também devolvia `200` mesmo com `Range`.
- **Ação:** testar A/B com:
  - `proxy_buffering off` e `proxy_request_buffering off` em `/api/v1/stream/`, com timeouts maiores (aplicado);
  - usar `streamLocalFile` quando houver `Range` em arquivo cacheado, para garantir `206` (aplicado);
  - service worker sem cache-first de HTML e com versão nova do cache (aplicado);
  - não duplicar o download no primeiro play ou implementar tee (stream + cache na mesma requisição);
  - limitar downloads de cache a 2–4 simultâneos e não cachear arquivos acima de um limite;
  - remover o segundo `<video autoplay>` do `GlobalMiniPlayer`;
  - preaquecer aulas populares e usar `faststart` no MP4;
  - cache HTTP para mídia e HLS 720p se o MP4 progressivo não estabilizar no mobile.
- **Métricas:** TTFB, tempo até o primeiro frame, latência de seek, rebuffering, erros 403/429 do Drive, CPU/RAM/disco e egress.
- **Critério de aceite:** startup <2s em 4G; seek <1s com cache e <3s sem cache; 20 simultâneos sem rebuffering; nenhum 429 do Drive.
- **Prioridade:** P1.

### TECH-29 — Plano de capacidade para 20 simultâneos e 5 TB

- **Contexto:** 20 usuários simultâneos, ~2 TB de cursos, Drive Pro 5 TB, Oracle Always Free (10 TB/mês de egress e disco raiz de 184 GB) e cache local com teto de 50 GB.
- **Avaliação:** 20 streams em 720p (~1,5–2,5 Mbps) cabem no egress mensal em uso moderado; o risco principal é o Google Drive não ser CDN, o cache de 50 GB ser pequeno para 2 TB e o download duplicado. 2 TB de armazenamento no Drive não é gratuito, mas já está contratado.
- **Ação:** executar teste de carga com 5, 10 e 20 sessões; medir egress; manter cache quente das aulas mais vistas; limitar conexões por usuário; monitorar 429/403; só migrar para R2/B2/Wasabi/Cloudflare Stream se o uso crescer além disso.
- **Critério de aceite:** 20 sessões simultâneas por 30 minutos sem erro e sem rebuffering, com relatório de egress e cache hit.
- **Prioridade:** P1.

### TECH-30 — Normalizar containers e validar mídia do Drive

- **Contexto:** a aula `5c3d6b3b-19a6-44ec-b4dc-d4d13b80631e` (`drive_file_id` `1wJU6yH89DKvzPsCfIkg6xesGX6qdU1wd`, 2,86 GB, 2h55) está marcada como `video/mp4`, mas o conteúdo é **MPEG-TS**: primeiro byte `0x47`, metadados `FFmpeg.Service` no payload e boxes MP4 inválidos. O md5 do cache confere com o `md5Checksum` do Drive, então o download está íntegro; o problema é o container/formato. O Chrome não reproduz TS via `<video src>`.
- **Impacto:** aulas específicas não carregam, o cache baixa 2,7 GB e o usuário não consegue distinguir problema de arquivo de problema de rede/player. Há também um material duplicado `.temp` (`12RRjuH0Ff3Jw_us-9GdhvxegaM6DUTK2`, 2,58 GB) que pode ser upload incompleto.
- **Ação:** validar magic bytes e `ffprobe` no sync ou no primeiro play; normalizar para MP4 H.264/AAC com `-movflags +faststart`; se necessário, gerar proxy 720p e salvar no Drive; registrar a variante em `media_variants`/`stream_drive_file_id`; não confiar apenas em extensão e `mimeType`.
- **Critério de aceite:** toda mídia reproduz no Chrome/Safari; TS/MKV/AVI renomeados são remuxados ou transcodificados; arquivo inválido gera erro explícito para o admin; md5 e tamanho são verificados após o download.
- **Prioridade:** P1.

### TECH-11 — Limpar o placeholder `X-Drive-Token`

- **Contexto:** o handler de streaming define `X-Drive-Token` com `DRIVE_ACCESS_TOKEN || "token-placeholder"`, mas o Nginx de produção serve o arquivo local e não usa esse header.
- **Ação:** remover o header morto ou documentar formalmente que ele só faz sentido em um modo futuro de proxy direto.
- **Prioridade:** P2.

---

## 5. Segurança e autenticação

### TECH-03 — Verificação de `Origin`/CSRF

- **Contexto:** o `CLAUDE.md` previa conferir o header `Origin` nas mutações; isso não está implementado. A proteção atual depende de `SameSite=Lax`.
- **Ação:** criar middleware para validar `Origin`/`Referer` em `POST`, `PATCH`, `PUT` e `DELETE` contra `WEBSERVER_ORIGIN`.
- **Critério de aceite:** requisição mutante com origem externa é rejeitada; fluxo normal continua funcionando.
- **Prioridade:** P0.

### TECH-04 — Tokens sensíveis em texto puro

- **Contexto:** sessões, convites e resets armazenam o token bruto no banco.
- **Riscos:** vazamento do banco permite reutilizar sessões/convites; logs e backups também expõem esses valores.
- **Ação:** armazenar apenas hash dos tokens e comparar por hash na validação. Sessões podem manter o token bruto se houver decisão explícita em contrário, mas convites e resets devem ser hasheados.
- **Prioridade:** P1.

### TECH-12 — Rate-limit em buckets separados

- **Contexto:** o login usa uma chave combinando IP + e-mail. Isso cobre os dois vetores em conjunto, mas não bloqueia separadamente um IP que ataca muitos e-mails nem um e-mail atacado por muitos IPs.
- **Ação:** avaliar dois contadores independentes (`login:ip` e `login:email`) com limites próprios.
- **Prioridade:** P2.

### TECH-13 — Revisar dependência de `SameSite` e CORS

- **Contexto:** a aplicação usa `SameSite=Lax` e não há CORS explícito. Para o modelo atual de mesma origem isso é aceitável, mas precisa ser reavaliado se houver subdomínios ou clientes externos.
- **Ação:** manter a decisão registrada e revisar quando o domínio definitivo for escolhido.
- **Prioridade:** P2.

---

## 6. Drive e sincronização

### TECH-01 — Reconciliar `feat/questions` com a `main`

- **Contexto:** a branch de questões divergiu em `7f8235d` e está 3 commits à frente, com cerca de 69 arquivos alterados. Ela não contém os últimos ajustes da `main` (README, correções de mobile, `.gitattributes`, sync idempotente).
- **Riscos:** conflitos silenciosos, regressões de mobile, perda de correções e deploy de uma árvore inconsistente.
- **Ação:** fazer rebase ou merge controlado, rodar lint, typecheck, Jest e Playwright, e validar o fluxo de cursos + questões em conjunto.
- **Critério de aceite:** branch atualizada, testes verdes e diff revisado antes do merge.
- **Prioridade:** P0 se questões forem para produção; P1 caso contrário.

### TECH-08 — Sync incremental do Drive

- **Contexto:** existe `drive_changes_token` no schema, mas ele não é usado. Hoje o sync é completo e sob demanda.
- **Riscos:** custo e tempo altos em pastas grandes; risco de atingir limites da Drive API.
- **Ação:** implementar Changes API com `startPageToken`, job scheduler periódico e sync completo noturno como rede de segurança.
- **Critério de aceite:** mudanças pequenas no Drive geram sync incremental; o sync completo continua disponível manualmente.
- **Prioridade:** P1.

### TECH-14 — Cache da árvore do curso

- **Contexto:** o `CLAUDE.md` prevê cache da árvore no Redis, mas `CourseModel.getTree` consulta o banco diretamente.
- **Ação:** decidir entre implementar o cache com invalidação no sync ou remover a promessa da documentação.
- **Prioridade:** P2.

### TECH-15 — Alinhar documentação e código do sync

- **Contexto:** o `CLAUDE.md` descreve lock no Redis, `jobId` determinístico, agendamentos e Changes API. O código atual tem `jobId` determinístico, mas não tem lock dedicado nem scheduler.
- **Ação:** implementar o que falta ou atualizar o documento para refletir o estado real.
- **Prioridade:** P1.

### TECH-26 — Robustez do preview/sync do Drive

- **Contexto:** `extractFolderId` não reconhece links `/file/d/<ID>/view` e devolve a URL inteira; o link de exemplo é de arquivo, não de pasta. O frontend faz `res.json()` sem tratar HTML; o Nginx usa `proxy_read_timeout` padrão de 60s e pode devolver 504 HTML em pastas grandes. O curso é criado antes do sync e permanece se o sync falhar.
- **Ação:** validar a pasta via `files.get` (`mimeType` de folder), aceitar `/file/d/` apenas para material, fazer parse seguro de JSON, aumentar/remover timeout do preview ou movê-lo para background, criar curso como `draft`/`syncing` e marcar `sync_failed` com retry em vez de deixar curso vazio. Não autoinscrever antes do sync concluir.
- **Critério de aceite:** link inválido retorna erro JSON claro e não cria curso; pasta grande não gera HTML; curso com sync falho fica identificado e pode ser ressincronizado.
- **Prioridade:** P0.

---

## 7. Aprendizado e experiência

### TECH-16 — Buffer de progresso no Redis

- **Contexto:** o `CLAUDE.md` prevê heartbeat no Redis + flush periódico para o PostgreSQL; o código grava direto no banco a cada 15 s.
- **Avaliação:** a gravação direta é mais simples e adequada ao volume atual; o buffer reduziria escrita, mas adiciona complexidade e risco de perda.
- **Ação:** decidir explicitamente entre manter a gravação direta (e atualizar a documentação) ou implementar o buffer.
- **Prioridade:** P2.

### TECH-17 — Cache de preferências e consistência offline

- **Contexto:** preferências do player vivem em `localStorage` e no banco.
- **Riscos:** divergência entre dispositivos e estados antigos após mudanças de schema.
- **Ação:** definir a fonte de verdade e uma estratégia simples de reconciliação.
- **Prioridade:** P2.

### TECH-18 — Cobertura de testes de experiência

- **Contexto:** o fluxo principal tem testes E2E, mas casos de erro, mobile específico e administração ainda são frágeis.
- **Ação:** ampliar cenários de falha de login, curso sem matrícula, sync com erro, PDF quebrado e recuperação de sessão.
- **Prioridade:** P1.

### TECH-24 — Player e reprodução no mobile

- **Contexto:** o player usa `<video>` nativo; faltam estados de carregamento/erro, retry, `playsInline`, `preload="metadata"`, poster, fullscreen/PiP e tratamento de rede instável.
- **Ação:** melhorar a experiência do player no mobile e no desktop, com foco em primeiro frame, seek, retomada de posição e mensagens de erro claras. Testar em 3G/4G simulados e iOS Safari.
- **Prioridade:** P1.

### TECH-25 — Scroll da sidebar de aulas no mobile

- **Contexto:** no mobile, a sidebar inline mostra apenas parte das aulas e não rola. O wrapper usa `max-h-[70vh] flex flex-col` com `overflow-hidden`; o filho tem `flex-1 overflow-y-auto` sem `min-h-0`, então não encolhe e é cortado.
- **Ação:** adicionar `min-h-0` ao container com scroll, remover o `max-h` no mobile ou usar `max-h-[calc(100dvh-...)]`, e testar rolagem/overscroll no iOS e Android.
- **Critério de aceite:** todas as aulas ficam acessíveis por rolagem, inclusive em cursos grandes.
- **Prioridade:** P1.

---

## 8. Questões e IA

### TECH-10 — Fase 10: ingestão de provas em PDF

- **Contexto:** a fase 9 entregou schema, API, UI e roteador de IA. A fase 10 ainda não foi implementada.
- **Escopo pendente:**
  - upload de prova e gabarito;
  - Docling para converter PDF em Markdown;
  - parser determinístico por banca;
  - fallback com IA para trechos problemáticos;
  - cruzamento com gabarito oficial;
  - classificação por disciplina/assunto;
  - embeddings e deduplicação com pgvector;
  - tela de revisão do admin;
  - publicação em lote.
- **Critério de aceite:** uma prova real importada com pelo menos 95% das questões corretas e fila de revisão funcional.
- **Prioridade:** P1.

### TECH-19 — Worker de IA e PDF

- **Contexto:** o worker atual só processa a fila `drive` e o job `syncCourse`.
- **Ação:** criar filas `ai` e `pdf`, com concorrência controlada, prioridades e retomada de jobs. A extração de provas e a geração assíncrona de explicações devem sair do request HTTP.
- **Prioridade:** P1.

### TECH-20 — Explicações síncronas no primeiro acesso

- **Contexto:** a primeira resposta de uma questão pode disparar uma chamada à cadeia `deep` de forma síncrona.
- **Riscos:** latência alta, timeout, consumo de cota em horário de pico e falha parcial do fluxo de resposta.
- **Ação:** enfileirar a geração de explicação e devolver a resposta imediatamente; a explicação aparece quando estiver pronta.
- **Prioridade:** P1.

### TECH-21 — Revisão de erros, simulados e coach

- **Contexto:** o modelo de dados prevê `error_reviews`, `simulados` e `ai_jobs`, mas as telas e a lógica ainda não existem.
- **Ação:** implementar em etapas:
  1. caderno de erros com FSRS;
  2. simulados com pontuação por banca;
  3. painel de desempenho por disciplina/assunto;
  4. relatório semanal do coach.
- **Prioridade:** P2.

### TECH-22 — Bug potencial em `/courses?public=true`

- **Contexto:** a página `/questions` busca `/api/v1/courses?public=true`, mas a rota de cursos exige autenticação e ignora o parâmetro `public`.
- **Ação:** corrigir a chamada ou criar uma rota pública/autenticada adequada para o filtro de cursos.
- **Prioridade:** P2.

---

## 9. Qualidade, testes e documentação

### TECH-02 — Corrigir os 4 erros de typecheck (concluído)

- **Contexto:** `node node_modules/typescript/bin/tsc --noEmit` reportava `tree` possivelmente `null` em:
  - `tests/integration/api/v1/notes/notes.test.ts`;
  - `tests/integration/api/v1/progress/progress.test.ts`;
  - `tests/integration/api/v1/reviews/reviews.test.ts`;
  - `tests/integration/api/v1/search/search.test.ts`.
- **Correção aplicada:** guarda `if (!tree) throw new Error("Course tree not found")` nos 4 testes; script `npm run typecheck` e step `Run Typecheck` adicionados ao CI.
- **Status:** concluído em 2026-11-16; commit `aa3db30` e CI #45 com `Run Typecheck` e testes de integração verdes.
- **Critério de aceite:** `tsc --noEmit` sem erros.
- **Prioridade:** Concluído.

### TECH-09 — Cobertura de rotas administrativas e erros

- **Contexto:** o fluxo principal tem boa cobertura, mas várias rotas de admin, validações de borda e falhas de permissão não têm teste dedicado.
- **Ação:** adicionar testes de integração para `admin/users`, `admin/enrollments`, `admin/courses/[id]/publish`, `admin/invites/[id]` e casos 401/403/404/422.
- **Prioridade:** P1.

### TECH-07 — Alinhar `CLAUDE.md` ao código

- **Contexto:** há promessas documentadas que não existem ou mudaram:
  - sync incremental e Changes API;
  - cache da árvore no Redis;
  - buffer de progresso no Redis com flush;
  - verificação de `Origin`/CSRF;
  - tokens armazenados como hash;
  - `/status` checando Redis, fila e Docling;
  - uso de Vidstack;
  - filas `ai`/`pdf` e fases 10–13.
- **Ação:** atualizar a documentação ou implementar o que falta. O documento não pode continuar sendo fonte de verdade para funcionalidades inexistentes.
- **Prioridade:** P1.

### TECH-23 — Remover dependências e artefatos não usados

- **Contexto:** `@vidstack/react` está instalado mas o player usa `<video>` nativo. O typecheck também gerou `tsconfig.tsbuildinfo` não rastreado.
- **Ação:** remover a dependência não usada ou usá-la de fato; adicionar `tsconfig.tsbuildinfo` ao `.gitignore` se for intencional.
- **Prioridade:** P2.

---

## 10. Política e fora de escopo

Itens que **não devem ser implementados sem uma decisão explícita**:

- Rotação de chaves ou múltiplas contas/projetos para somar cotas gratuitas de IA.
- Raspagem de sites comerciais de questões.
- Migração do Pages Router para App Router sem ADR.
- Mudança das decisões arquiteturais do `CLAUDE.md` sem ADR em `docs/decisions.md`.
- Exposição de vídeos por iframe público do Drive.
- Cache de vídeos pelo service worker do PWA.

---

## 11. Checklist de curto prazo

- [ ] Confirmar o commit em produção na VM.
- [ ] Corrigir os 4 erros de typecheck e incluir `tsc --noEmit` no CI.
- [ ] Implementar verificação de `Origin` em mutações.
- [ ] Configurar SMTP de produção.
- [ ] Validar streaming real com volume e Nginx.
- [ ] Reconciliar `feat/questions` com a `main`.
- [ ] Atualizar `CLAUDE.md` para refletir o estado real do código.
- [ ] Definir modelo de operação, nome e domínio.
- [ ] Fechar a taxonomia inicial e as bancas prioritárias.
- [ ] Planejar a fase 10 (ingestão de provas).
- [ ] Implementar o pipeline 720p e o mapeamento de variantes.
- [ ] Testar velocidade e capacidade com 20 sessões simultâneas.
- [ ] Corrigir o scroll da sidebar de aulas no mobile.
- [ ] Endurecer o preview/sync do Drive contra links de arquivo e pastas grandes.

---

## 12. Última atualização

- **2026-11-16:** documento reestruturado por prioridade, com separação entre decisões de produto, infraestrutura, segurança, Drive, experiência, questões/IA e qualidade. Foram incorporadas lacunas identificadas na análise do código e das branches. Também foram registrados os 8 itens de produto/experiência pendentes, a decisão de servir vídeo em 720p, o Drive Pro de 5 TB e o plano de teste de velocidade/capacidade para 20 simultâneos. A medição de disco da VM e a reserva de 50 GB para o cache foram registradas em [`infraestrutura-vm.md`](./infraestrutura-vm.md).
