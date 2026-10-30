# 📌 Decisões e Pendências a Resolver

Este documento reúne todas as decisões em aberto, configurações pendentes e pontos de atenção mapeados para o projeto, organizados por área para acompanhamento e resolução futura.

---

## 1. Identidade e Produto

- [ ] **Nome Definitivo da Plataforma**
  - *Contexto:* Atualmente o projeto utiliza o codinome provisório **"Aula"** (e internamente **"CDF"**).
  - *O que afeta:* Título das páginas (`<title>`), logo, favicon, manifesto do PWA, e-mails de convite e identidade visual.
  - *Ação necessária:* Definir o nome comercial/oficial para aplicarmos na aplicação inteira.

- [ ] **Domínio Oficial de Acesso**
  - *Contexto:* A VM e o proxy reverso Caddy estão configurados temporariamente para `aula.vhmedeiros.dev.br`.
  - *O que afeta:* DNS no Registro.br / Cloudflare, certificado SSL automático e a variável `WEBSERVER_ORIGIN` no `.env.production`.
  - *Ação necessária:* Escolher se mantém este subdomínio ou se aponta um domínio próprio definitivo.

- [ ] **Modelo de Operação (Uso Próprio/Fechado vs. Comercial)**
  - *Uso Próprio / Grupo Fechado:*
    - Foco em estudos pessoais e amigos convidados.
    - Pode operar inteiramente com a cota gratuita do Google Gemini e sem necessidade de termos de adesão complexos ou gateway de pagamento.
  - *Comercial (Venda de Assinaturas):*
    - Exige migração para plano pago de APIs de IA (com faturamento e teto de gastos configurado).
    - Exige gateway de pagamentos (ex: Asaas, Stripe, Mercado Pago), emissão de NF, Termos de Uso e Política de Privacidade (LGPD).

---

## 2. Infraestrutura e Serviços Externos

- [ ] **Provedor de E-mail Transacional (SMTP em Produção)**
  - *Contexto:* Em ambiente de desenvolvimento local, utilizamos o **Mailcatcher** (porta 1080), que intercepta os e-mails falsos sem dispará-los na internet.
  - *O que afeta:* Envio real de links de convite para novos alunos e links de recuperação/redefinição de senha.
  - *Ação necessária:* Criar conta em um serviço SMTP (ex: Resend, Brevo, SendGrid, Amazon SES ou Gmail com Senha de App) e preencher as variáveis no `.env.production` da VM (`EMAIL_SMTP_HOST`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD`, `EMAIL_FROM`).

- [ ] **Monitoramento de Erros e Exceções (Sentry)**
  - *Contexto:* A variável `SENTRY_DSN` está prevista no `.env.example`.
  - *O que afeta:* Rastreamento em tempo real de erros no frontend (browser do aluno) e backend (Next.js/Worker).
  - *Ação necessária:* Criar projeto no Sentry.io e adicionar o DSN no `.env.production` (opcional para uso inicial).

---

## 3. Conteúdo, Taxonomia e Banco de Provas

- [ ] **Lista Oficial de Disciplinas e Assuntos (Taxonomia Fixa)**
  - *Contexto:* O banco de dados atualmente possui cadastradas:
    - *Direito Constitucional*
    - *Direito Administrativo*
    - *Língua Portuguesa*
    - *Raciocínio Lógico*
    - *Programação e Backend Java* (do curso Java 10x)
  - *Ação necessária:* Listar as próximas disciplinas e seus tópicos prioritários para cadastrar na taxonomia fixa (ex: *Direito Penal, Informática, Administração Geral, Contabilidade, etc.*).

- [ ] **Bancas Organizadoras Prioritárias**
  - *Contexto:* Cadastradas atualmente: *Cebraspe, FGV, FCC, Vunesp*.
  - *Ação necessária:* Definir quais outras bancas devem ser incluídas prioritariamente no importador (ex: *Cesgranrio, Instituto AOCP, Quadrix, Selecon, IBFC*).

- [ ] **Diretriz de Direitos Autorais das Questões**
  - *Regra inegociável:* Utilizar **apenas provas e gabaritos oficiais públicos** disponibilizados pelas bancas e órgãos.
  - *Proibição:* **Nunca** raspar sites comerciais de questões (QConcursos, TecConcursos, etc.), pois comentários de professores e formatação dessas plataformas possuem propriedade intelectual protegida.

---

## 4. Inteligência Artificial (Para Ativação Futura)

- [ ] **Chave Definitiva da API Gemini (`GEMINI_API_KEY`)**
  - *Contexto:* A arquitetura do roteador de IA em cascata (`services/ai/router.ts`) e o controle de cota por minuto/dia no Redis estão prontos.
  - *Ação necessária:* Gerar a chave de API gratuita no [Google AI Studio](https://aistudio.google.com/) e inseri-la no ambiente quando formos ativar as explicações automáticas das questões e o coach de IA.
