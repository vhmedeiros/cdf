# Fase 5: Aprendizado Ativo (Progresso no Servidor, Anotações com Timestamp e Pomodoro)

Bem-vindo ao guia da **Fase 5**! Se nas fases anteriores criamos o streaming e a casca da sala de aula digital, aqui transformamos a plataforma em um ambiente de **estudo ativo e de alta retenção**:

1. **Retomada Exata de Onde Parou**: O sistema salva no banco de dados a posição do vídeo e marca como concluído automaticamente ao atingir 90%. Se você fechar o navegador e voltar amanhã, o player reabre no segundo exato onde parou.
2. **Anotações Inteligentes com Timestamp**: Pressione a tecla `N` para pausar o vídeo e registrar um insight vinculado ao momento exato da aula. Clicar no timestamp pula o player direto para aquele trecho.
3. **Pomodoro de Foco Sincronizado**: Cronômetro de produtividade integrado ao topo da aula com alertas sonoros sintetizados via Web Audio API.
4. **Caderno Geral do Curso**: Uma página dedicada que reúne todas as suas anotações do curso, com busca em tempo real e exportação direta em Markdown (.md) para o Obsidian ou Notion.

---

## 1. Analogia com o Django: O Desafio de Salvar o Progresso do Aluno

No Django tradicional, uma abordagem comum e ingênua seria:

```python
# ❌ Abordagem ingênua no Django
def save_progress(request):
    material_id = request.POST.get('material_id')
    position = request.POST.get('position')
    Progress.objects.update_or_create(
        user=request.user,
        material_id=material_id,
        defaults={'position_seconds': position}
    )
```

### O problema de escala:

Se 500 alunos estiverem assistindo aulas simultaneamente e cada navegador enviar uma requisição a cada 5 segundos:

- São **100 requisições de escrita por segundo** (`UPDATE progress`) saturando os locks de linha do PostgreSQL.
- Se o aluno simplesmente fechar a aba do navegador, a requisição AJAX normal pode ser abortada antes de chegar ao servidor, perdendo os últimos minutos assistidos.

### Como resolvemos no Node.js + PostgreSQL:

1. **Heartbeat Gradual de 15 Segundos**:
   - Em vez de floodar a cada segundo, o `PlayerContext` dispara um heartbeat leve a cada 15s de reprodução contínua.
2. **`navigator.sendBeacon` no Fechamento da Aba**:
   - Ao fechar o navegador (`window.beforeunload`), requisições `fetch` assíncronas normais costumam ser canceladas pelo navegador.
   - O `sendBeacon` envia um pacote pequeno em segundo plano que o navegador **garante** entregar ao servidor mesmo após o fechamento da janela:
   ```typescript
   navigator.sendBeacon("/api/v1/progress/batch", payload);
   ```
3. **Upsert Atômico com `ON CONFLICT`**:
   - Uma única instrução SQL atualiza a posição, soma os segundos assistidos (`watched_seconds`) e marca a conclusão automática quando passa de 90%:
   ```sql
   INSERT INTO progress (user_id, material_id, course_id, position_seconds, is_completed)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (user_id, material_id) DO UPDATE SET
     position_seconds = EXCLUDED.position_seconds,
     watched_seconds = progress.watched_seconds + EXCLUDED.watched_seconds,
     is_completed = CASE WHEN EXCLUDED.is_completed THEN true ELSE progress.is_completed END,
     updated_at = now();
   ```

---

## 2. A Mágica dos Timestamps Clicáveis nas Anotações

Anotações de aulas só têm valor real se estiverem contextualizadas. Não adianta anotar _"atenção ao prazo decadencial"_ sem saber em qual minuto o professor explicou a exceção da regra.

### Como funciona o fluxo:

1. O aluno está assistindo à aula e ouve uma explicação crucial aos `08:42`.
2. Ele pressiona a tecla **`N`** (ou clica no ícone de nota sobre o vídeo).
3. O player **pausa automaticamente**, abre o editor e captura `timestamp_seconds = 522`.
4. Ao salvar, a nota ganha uma etiqueta dourada interativa: `▶ 08:42`.
5. Dias depois, ao revisar suas notas, um clique na etiqueta executa `seekTo(522)`, pulando o vídeo e iniciando a reprodução exatamente no momento desejado.

---

## 3. Som de Conclusão do Pomodoro sem Dependências Externas

Para criar o alerta sonoro de término do ciclo de Pomodoro (foco ou pausa), a tentação habitual seria baixar um arquivo `.mp3` da internet e tocar com `new Audio('/chime.mp3')`.

### Por que evitamos arquivos MP3 estáticos?

- Podem falhar se o arquivo sumir ou for bloqueado por políticas de CORS/AdBlockers.
- Geram requisições HTTP adicionais e aumentam o bundle.

### A Solução: Sintetizador Web Audio API Nativo

Criamos um sino de meditação puro usando osciladores de frequência harmônica nativos do navegador:

```typescript
const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();

osc.type = "sine";
osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Tom Ré (D5)
osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // Tom Lá (A5)

gain.gain.setValueAtTime(0.15, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2); // Decaimento suave

osc.connect(gain);
gain.connect(ctx.destination);
osc.start();
osc.stop(ctx.currentTime + 1.2);
```

**Resultado:** Um som suave, elegante, sem arquivos externos e que toca em 0 milissegundos com zero dependências.

---

## 4. Caderno de Estudos Exportável para Markdown (.md)

Na rota `/courses/[slug]/caderno`, o aluno tem a visão consolidada de todas as suas notas do curso agrupadas por Módulo e por Aula.

Com um único clique no botão **"Exportar Markdown (.md)"**, o sistema gera um arquivo formatado com cabeçalhos, timestamps e marcas de importância (`⭐ IMPORTANTE`), pronto para ser arrastado diretamente para seu cofre do **Obsidian**, página do **Notion** ou caderno pessoal de resumos.

---

## 5. Resumo das Decisões de Arquitetura da Fase 5

| Funcionalidade              | Solução Implementada                           | Benefício Principal                                                           |
| :-------------------------- | :--------------------------------------------- | :---------------------------------------------------------------------------- |
| **Persistência de Posição** | `progress` table + heartbeat 15s + sendBeacon  | Retoma de onde parou sem perda de progresso ao fechar abas                    |
| **Conclusão Automática**    | Razão configurável (`PROGRESS_COMPLETE_RATIO`) | Passar de 90% assistido marca o material como concluído automaticamente       |
| **Atalho de Anotação**      | Tecla `N` com captura de timestamp             | Estudo ativo sem tirar a mão do teclado                                       |
| **Sino do Pomodoro**        | Web Audio API (`OscillatorNode`)               | Som cristalino sem carregar arquivos MP3 da rede                              |
| **Caderno do Curso**        | Rota dedicada `/caderno` + exportação Blob .md | Portabilidade total para ferramentas de Second Brain (Obsidian, Notion, etc.) |
