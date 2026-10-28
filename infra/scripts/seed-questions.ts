import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

dotenvExpand.expand(dotenv.config({ path: ".env.development" }));

import database from "@/infra/database";
import SubjectModel from "@/models/subject";
import TopicModel from "@/models/topic";
import BoardModel from "@/models/board";
import ExamModel from "@/models/exam";
import QuestionModel from "@/models/question";

export async function seedQuestionsTaxonomy(): Promise<void> {
  console.log("🌱 Populando taxonomia de disciplinas e bancas...");

  // 1. Bancas examinadoras
  const boardsData = [
    {
      name: "Cebraspe (CESPE)",
      slug: "cebraspe",
      answer_format: "both" as const,
      scoring: { wrong_cancels_right: true, penalty_ratio: 1.0 },
    },
    {
      name: "Fundação Getulio Vargas (FGV)",
      slug: "fgv",
      answer_format: "multiple_choice" as const,
      scoring: {},
    },
    {
      name: "Fundação Carlos Chagas (FCC)",
      slug: "fcc",
      answer_format: "multiple_choice" as const,
      scoring: {},
    },
    {
      name: "Fundação Vunesp",
      slug: "vunesp",
      answer_format: "multiple_choice" as const,
      scoring: {},
    },
  ];

  const boardsMap = new Map<string, any>();
  for (const b of boardsData) {
    try {
      const board = await BoardModel.create(b);
      boardsMap.set(b.slug, board);
    } catch {
      const existing = await BoardModel.findBySlug(b.slug);
      boardsMap.set(b.slug, existing);
    }
  }

  // 2. Disciplinas e Assuntos
  const subjectsData = [
    {
      name: "Direito Constitucional",
      slug: "direito-constitucional",
      color: "#d4af37",
      description: "Princípios fundamentais, direitos e garantias, organização dos poderes e do Estado.",
      topics: [
        { name: "Direitos e Garantias Fundamentais (Art. 5º)", slug: "direitos-fundamentais" },
        { name: "Princípios Fundamentais da República", slug: "principios-fundamentais" },
        { name: "Organização do Estado e Repartição de Competências", slug: "organizacao-do-estado" },
        { name: "Poder Executivo e Atribuições do Presidente", slug: "poder-executivo" },
        { name: "Poder Judiciário e Controle de Constitucionalidade", slug: "poder-judiciario" },
      ],
    },
    {
      name: "Direito Administrativo",
      slug: "direito-administrativo",
      color: "#e5a93b",
      description: "Regime jurídico-administrativo, princípios, atos, poderes, licitações e contratos.",
      topics: [
        { name: "Princípios da Administração Pública (LIMPE)", slug: "principios-da-administracao" },
        { name: "Atos Administrativos (Requisitos e Atributos)", slug: "atos-administrativos" },
        { name: "Poderes Administrativos (Vinculado, Discricionário, Hierárquico, Polícia)", slug: "poderes-administrativos" },
        { name: "Licitações e Contratos (Nova Lei 14.133/2021)", slug: "licitacoes-e-contratos" },
        { name: "Responsabilidade Civil do Estado", slug: "responsabilidade-civil" },
      ],
    },
    {
      name: "Língua Portuguesa",
      slug: "lingua-portuguesa",
      color: "#4a90e2",
      description: "Gramática, interpretação de textos, sintaxe, concordância e pontuação.",
      topics: [
        { name: "Compreensão e Interpretação de Textos", slug: "compreensao-de-textos" },
        { name: "Emprego do Sinal Indicativo de Crase", slug: "crase" },
        { name: "Sintaxe de Concordância Verbal e Nominal", slug: "concordancia" },
        { name: "Sintaxe de Regência Verbal e Nominal", slug: "regencia" },
        { name: "Pontuação e Emprego da Vírgula", slug: "pontuacao" },
      ],
    },
    {
      name: "Raciocínio Lógico & Matemática",
      slug: "raciocinio-logico",
      color: "#50e3c2",
      description: "Lógica proposicional, tabelas-verdade, equivalências, probabilidade e combinatória.",
      topics: [
        { name: "Proposições Lógicas e Conectivos", slug: "proposicoes-e-conectivos" },
        { name: "Equivalências Lógicas e Negações (Leis de De Morgan)", slug: "equivalencias-logicas" },
        { name: "Tabelas-Verdade e Tautologias", slug: "tabelas-verdade" },
        { name: "Análise Combinatória", slug: "analise-combinatoria" },
        { name: "Probabilidade", slug: "probabilidade" },
      ],
    },
  ];

  const topicsMap = new Map<string, any>();
  for (const s of subjectsData) {
    let subject;
    try {
      subject = await SubjectModel.create({
        name: s.name,
        slug: s.slug,
        color: s.color,
        description: s.description,
      });
    } catch {
      subject = await SubjectModel.findBySlug(s.slug);
    }

    for (const t of s.topics) {
      try {
        const topic = await TopicModel.create({
          subject_id: subject.id,
          name: t.name,
          slug: t.slug,
        });
        topicsMap.set(`${s.slug}:${t.slug}`, topic);
      } catch {
        // Tópico já existente
      }
    }
  }

  // 3. Prova Modelo: BACEN 2024 / Cebraspe
  const cebraspeBoard = boardsMap.get("cebraspe");
  let examBacen;
  if (cebraspeBoard) {
    try {
      examBacen = await ExamModel.create({
        board_id: cebraspeBoard.id,
        organ: "Banco Central do Brasil (BACEN)",
        position: "Analista - Área de Tecnologia da Informação",
        level: "Superior",
        year: 2024,
        status: "published",
        file_hash: "bacen-2024-hash-demo",
      });
    } catch {
      const exams = await ExamModel.list({ organ: "Banco Central do Brasil (BACEN)" });
      examBacen = exams[0];
    }
  }

  // 4. Questões modelo oficiais com explicações completas
  if (examBacen) {
    const dirConstTopic = topicsMap.get("direito-constitucional:direitos-fundamentais");
    const dirAdmTopic = topicsMap.get("direito-administrativo:principios-da-administracao");

    const existingQ1 = await database.query({
      text: "SELECT id FROM questions WHERE statement ILIKE $1 LIMIT 1;",
      values: ["%À luz da Constituição Federal de 1988%"],
    });

    if (existingQ1.rowCount === 0) {
      // Questão 1 (Cebraspe Certo/Errado)
      const q1 = await QuestionModel.create({
        exam_id: examBacen.id,
        number: 1,
        statement:
          "À luz da Constituição Federal de 1988, a casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, salvo em caso de flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial.",
        format: "true_false",
        correct_answer: "C",
        status: "published",
        origin: "official",
        difficulty: 0.15,
        topic_ids: dirConstTopic ? [dirConstTopic.id] : [],
        alternatives: [
          { letter: "C", body: "Certo" },
          { letter: "E", body: "Errado" },
        ],
      });

      // Adiciona explicação oficial da Questão 1
      await database.query({
        text: `
          INSERT INTO explanations (question_id, body, per_alternative, model, prompt_version)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (question_id) DO NOTHING;
        `,
        values: [
          q1.id,
          "### Gabarito: Certo (C)\n\nA assertiva reproduz a literalidade exata do **art. 5º, inciso XI, da Constituição Federal de 1988**:\n\n> *'a casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, salvo em caso de flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial;'*\n\n**Pontos essenciais para concurso:**\n1. **A qualquer hora (dia ou noite):** flagrante delito, desastre ou socorro;\n2. **Apenas durante o dia:** por determinação judicial (mandado de busca e apreensão).",
          JSON.stringify({
            C: "Correto. Trata-se da garantia fundamental da inviolabilidade domiciliar prevista no art. 5º, XI, da CF/88.",
            E: "Incorreto. A assertiva reflete com exatidão o texto constitucional.",
          }),
          "gemini-3.8-flash",
          "v1",
        ],
      });
    }

    // Questão 2 (Múltipla Escolha - FGV / Administrativo)
    const fgvBoard = boardsMap.get("fgv");
    let examFgv;
    if (fgvBoard) {
      examFgv = await ExamModel.create({
        board_id: fgvBoard.id,
        organ: "Tribunal de Contas da União (TCU)",
        position: "Auditor Federal de Controle Externo",
        level: "Superior",
        year: 2024,
        status: "published",
        file_hash: "tcu-fgv-2024-hash-demo",
      });
    }

    if (examFgv) {
      const existingQ2 = await database.query({
        text: "SELECT id FROM questions WHERE statement ILIKE $1 LIMIT 1;",
        values: ["%O princípio da Administração Pública que veda a utilização de nomes%"],
      });

      if (existingQ2.rowCount === 0) {
        const q2 = await QuestionModel.create({
          exam_id: examFgv.id,
          number: 15,
          statement:
            "O princípio da Administração Pública que veda a utilização de nomes, símbolos ou imagens que caracterizem promoção pessoal de autoridades ou servidores públicos em publicidade institucional de atos, programas, obras e serviços é expressamente o princípio da:",
          format: "multiple_choice",
          correct_answer: "B",
          status: "published",
          origin: "official",
          difficulty: 0.22,
          topic_ids: dirAdmTopic ? [dirAdmTopic.id] : [],
          alternatives: [
            { letter: "A", body: "Legalidade estrita" },
            { letter: "B", body: "Impessoalidade" },
            { letter: "C", body: "Eficiência" },
            { letter: "D", body: "Continuidade dos serviços públicos" },
            { letter: "E", body: "Autotutela administrativa" },
          ],
        });

        // Adiciona explicação oficial da Questão 2
        await database.query({
          text: `
            INSERT INTO explanations (question_id, body, per_alternative, model, prompt_version)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (question_id) DO NOTHING;
          `,
          values: [
            q2.id,
            "### Gabarito: B (Impessoalidade)\n\nO veto à promoção pessoal em publicidade governamental decorre diretamente do **princípio da impessoalidade**, expressamente consagrado no **art. 37, § 1º, da CF/88**:\n\n> *'A publicidade dos atos, programas, obras, serviços e campanhas dos órgãos públicos deverá ter caráter educativo, informativo ou de orientação social, dela não podendo constar nomes, símbolos ou imagens que caracterizem promoção pessoal de autoridades ou servidores públicos.'*",
            JSON.stringify({
              A: "Incorreto. O princípio da legalidade determina que o administrador só pode fazer o que a lei expressamente autoriza.",
              B: "Correto. O princípio da impessoalidade veda a apropriação e personificação da atividade administrativa pelo agente público.",
              C: "Incorreto. O princípio da eficiência refere-se à busca pela melhor produtividade e economicidade dos recursos públicos.",
              D: "Incorreto. O princípio da continuidade versa sobre o não interrompimento injustificado de serviços públicos.",
              E: "Incorreto. A autotutela é o poder da administração de anular seus atos ilegais e revogar os inoportunos.",
            }),
            "gemini-3.8-flash",
            "v1",
          ],
        });
      }
    }
  }

  console.log("✅ Taxonomia de disciplinas, bancas e questões populada com sucesso!");
}

if (require.main === module) {
  seedQuestionsTaxonomy()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
