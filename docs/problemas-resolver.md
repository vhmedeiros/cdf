# 📌 Decisões e Pendências a Resolver

Este documento reúne todas as decisões em aberto, configurações pendentes e pontos de atenção mapeados para o projeto, organizados por área para acompanhamento e resolução futura.

---

## 1. Identidade e Produto

- [ ] **Nome Definitivo da Plataforma**

  - _Contexto:_ Atualmente o projeto utiliza o codinome provisório **"Aula"** (e internamente **"CDF"**).
  - _O que afeta:_ Título das páginas (`<title>`), logo, favicon, manifesto do PWA, e-mails de convite e identidade visual.
  - _Ação necessária:_ Definir o nome comercial/oficial para aplicarmos na aplicação inteira.

- [ ] **Domínio Oficial de Acesso**

  - _Contexto:_ A VM e o proxy reverso Caddy estão configurados temporariamente para `aula.vhmedeiros.dev.br`.
  - _O que afeta:_ DNS no Registro.br / Cloudflare, certificado SSL automático e a variável `WEBSERVER_ORIGIN` no `.env.production`.
  - _Ação necessária:_ Escolher se mantém este subdomínio ou se aponta um domínio próprio definitivo.

- [ ] **Modelo de Operação (Uso Próprio/Fechado vs. Comercial)**
  - _Uso Próprio / Grupo Fechado:_
    - Foco em estudos pessoais e amigos convidados.
    - Pode operar inteiramente com a cota gratuita do Google Gemini e sem necessidade de termos de adesão complexos ou gateway de pagamento.
  - _Comercial (Venda de Assinaturas):_
    - Exige migração para plano pago de APIs de IA (com faturamento e teto de gastos configurado).
    - Exige gateway de pagamentos (ex: Asaas, Stripe, Mercado Pago), emissão de NF, Termos de Uso e Política de Privacidade (LGPD).

---

## 2. Infraestrutura e Serviços Externos

- [ ] **Provedor de E-mail Transacional (SMTP em Produção)**

  - _Contexto:_ Em ambiente de desenvolvimento local, utilizamos o **Mailcatcher** (porta 1080), que intercepta os e-mails falsos sem dispará-los na internet.
  - _O que afeta:_ Envio real de links de convite para novos alunos e links de recuperação/redefinição de senha.
  - _Ação necessária:_ Criar conta em um serviço SMTP (ex: Resend, Brevo, SendGrid, Amazon SES ou Gmail com Senha de App) e preencher as variáveis no `.env.production` da VM (`EMAIL_SMTP_HOST`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD`, `EMAIL_FROM`).

- [ ] **Monitoramento de Erros e Exceções (Sentry)**
  - _Contexto:_ A variável `SENTRY_DSN` está prevista no `.env.example`.
  - _O que afeta:_ Rastreamento em tempo real de erros no frontend (browser do aluno) e backend (Next.js/Worker).
  - _Ação necessária:_ Criar projeto no Sentry.io e adicionar o DSN no `.env.production` (opcional para uso inicial).

---

## 3. Conteúdo, Taxonomia e Banco de Provas

- [ ] **Lista Oficial de Disciplinas e Assuntos (Taxonomia Fixa)**

  - _Contexto:_ O banco de dados atualmente possui cadastradas:
    - _Direito Constitucional_
    - _Direito Administrativo_
    - _Língua Portuguesa_
    - _Raciocínio Lógico_
    - _Programação e Backend Java_ (do curso Java 10x)
  - _Ação necessária:_ Listar as próximas disciplinas e seus tópicos prioritários para cadastrar na taxonomia fixa (ex: _Direito Penal, Informática, Administração Geral, Contabilidade, etc._).

- [ ] **Bancas Organizadoras Prioritárias**

  - _Contexto:_ Cadastradas atualmente: _Cebraspe, FGV, FCC, Vunesp_.
  - _Ação necessária:_ Definir quais outras bancas devem ser incluídas prioritariamente no importador (ex: _Cesgranrio, Instituto AOCP, Quadrix, Selecon, IBFC_).

- [ ] **Diretriz de Direitos Autorais das Questões**
  - _Regra inegociável:_ Utilizar **apenas provas e gabaritos oficiais públicos** disponibilizados pelas bancas e órgãos.
  - _Proibição:_ **Nunca** raspar sites comerciais de questões (QConcursos, TecConcursos, etc.), pois comentários de professores e formatação dessas plataformas possuem propriedade intelectual protegida.

---

## 4. Inteligência Artificial (Para Ativação Futura)

- [ ] **Chave Definitiva da API Gemini (`GEMINI_API_KEY`)**
  - _Contexto:_ A arquitetura do roteador de IA em cascata (`services/ai/router.ts`) e o controle de cota por minuto/dia no Redis estão prontos.
  - _Ação necessária:_ Gerar a chave de API gratuita no [Google AI Studio](https://aistudio.google.com/) e inseri-la no ambiente quando formos ativar as explicações automáticas das questões e o coach de IA.
