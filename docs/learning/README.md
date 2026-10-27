# 📚 Documentação de Aprendizado — Plataforma CDF

Bem-vindo ao caderno de estudos do projeto! Cada fase tem um arquivo explicando **o que foi feito**, **por quê**, e **como funciona na prática** — com analogias para quem já conhece Django.

## Índice por Fases

| Fase                     | Arquivo                                          | Status       |
| ------------------------ | ------------------------------------------------ | ------------ |
| 0. Fundação              | [fase-0-fundacao.md](./fase-0-fundacao.md)       | ✅ Concluída |
| 1. Contas e Autenticação | [fase-1-contas.md](./fase-1-contas.md)           | ✅ Concluída |
| 2. Cursos + Drive        | [fase-2-cursos.md](./fase-2-cursos.md)           | ✅ Concluída |
| 3. Streaming             | [fase-3-streaming.md](./fase-3-streaming.md)     | ✅ Concluída |
| 4. Experiência de Aula   | [fase-4-player.md](./fase-4-player.md)           | ✅ Concluída |
| 5. Aprendizado           | [fase-5-aprendizado.md](./fase-5-aprendizado.md) | ✅ Concluída |
| 6. Engajamento           | [fase-6-engajamento.md](./fase-6-engajamento.md) | ✅ Concluída |

---

## 💡 Guia de Descobertas e Arquitetura

Além do passo a passo de cada fase, mantemos um documento central com os maiores desafios técnicos enfrentados e suas soluções detalhadas:

👉 **[Descobertas de Arquitetura e Lições Práticas](./descobertas-e-licoes.md)**

- _Connection Leaks_ no Node.js vs Django
- Como resolver o problema N+1 com SQL Puro (`ANY($1::uuid[])`)
- Como funciona o seek de vídeos via Range Requests (HTTP 206)
- A técnica `X-Accel-Redirect` do Nginx para desonerar o backend
- O poder das funções puras para testar regras complexas em milissegundos

---

> **Como usar este caderno:**
>
> - Leia o arquivo da fase **antes** de olhar o código — ele dá o mapa mental.
> - Depois, abra os arquivos mencionados no VSCode e releia com o código na tela.
> - Se algo não fez sentido, é uma ótima pergunta para a próxima sessão!
