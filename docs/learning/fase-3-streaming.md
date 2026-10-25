# Fase 3 — Streaming Seguro de Mídia

> **Analogia geral:** No Django, para servir arquivos privados sem travar o processo
> Python com I/O pesado de disco ou rede, você usa **`django-sendfile`** ou
> o cabeçalho **`X-Accel-Redirect`** do Nginx.
> O Django apenas valida a permissão do usuário e devolve uma resposta vazia
> com um cabeçalho especial. O Nginx assume a transmissão dos bytes.
> Aqui implementamos exatamente esse padrão para o Google Drive.

---

## 1. Por que NÃO usar o iframe do Google Drive?

O Google Drive oferece um iframe (`drive.google.com/file/d/<id>/preview`).
Muitos projetos amadores usam isso, mas ele tem problemas fatais:

1. **Exige arquivos públicos:** qualquer pessoa com o link poderia compartilhar ou baixar o vídeo.
2. **Sem controle de reprodução:** o JavaScript do seu frontend **não tem acesso** ao que acontece dentro do iframe (cross-origin iframe). Você não consegue saber onde o aluno parou, não consegue avançar para a próxima aula automaticamente (autoplay) e não pode trocar a velocidade para 1.5x ou 2.0x.
3. **Visual feio:** exibe a barra e a marca d'água do Google Drive sobre o conteúdo.

---

## 2. A Arquitetura Escolhida: "Next.js autoriza, Nginx transmite"

Em vez do iframe, fazemos com que a tag `<video>` do navegador aponte para a nossa própria API:

```html
<video src="/api/v1/stream/uuid-do-material"></video>
```

Como a URL é da mesma origem (`/api/v1/...`), o navegador envia automaticamente o cookie seguro `session_id`.

### O Fluxo em Produção:

```
[Navegador]                      [Next.js API]                     [Nginx]                    [Google Drive]
     |                                 |                              |                              |
     | 1. GET /api/v1/stream/[id] ---> |                              |                              |
     |    (com cookie session_id)      |                              |                              |
     |                                 | 2. Valida sessão no Postgres |                              |
     |                                 |    Valida matrícula no curso |                              |
     |                                 |                              |                              |
     |                                 | 3. Responde em 2ms:          |                              |
     |                                 |    X-Accel-Redirect: /_drive/123                            |
     |                                 |    X-Drive-Token: sa_token   |                              |
     |                                 | ---------------------------> |                              |
     |                                                                | 4. Proxy com Range: bytes... |
     |                                                                | ---------------------------> |
     |                                                                | <--- 206 Partial Content --- |
     | <--- 206 Partial Content (Vídeo transmitido pelo Nginx) ------ |                              |
```

### Vantagens dessa solução:

1. **O Node.js fica livre na hora:** a requisição dura apenas 2 a 5 milissegundos no Node. Ele não gasta memória nem CPU transmitindo gigabytes de vídeo.
2. **Segurança total:** a Service Account do Google nunca vaza para o cliente. O Nginx faz o proxy com `Authorization: Bearer` internamente.
3. **Seek perfeito (HTTP 206):** quando o aluno pula para o minuto 10:00 do vídeo, o navegador envia `Range: bytes=52428800-`. O Nginx repassa esse range para o Google Drive e devolve apenas o pedaço requisitado.

---

## 3. O Modo de Desenvolvimento (`STREAM_MODE=node`)

Em desenvolvimento na sua máquina, você não precisa subir o Nginx só para testar.
A variável de ambiente `STREAM_MODE=node` instrui a rota [`pages/api/v1/stream/[id].ts`](../../pages/api/v1/stream/[id].ts)
a tratar os Range Requests diretamente no Node.js.

### Como desabilitar os limites do Next.js para streaming:

Por padrão, o Next.js tenta fazer o parse do corpo da requisição e limita o tamanho da resposta a 4MB. Para streaming de vídeo, desligamos esses limites:

```typescript
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
```

---

## 4. O que testamos nos Testes de Integração

No arquivo [`tests/integration/api/v1/stream/get.test.ts`](../../tests/integration/api/v1/stream/get.test.ts):

1. **Aluno sem matrícula recebe 403 Forbidden:** garante que ninguém consegue ver vídeos sem matrícula ativa.
2. **Range Requests devolvem 206 Partial Content:** testa o seek do vídeo com os cabeçalhos `Content-Range` e `Accept-Ranges: bytes`.
3. **Sem vazamento de tokens:** verifica se nenhum token de autorização interno aparece nos headers da resposta.
