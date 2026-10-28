import orchestrator from "@/tests/orchestrator";
import User from "@/models/user";
import Session from "@/models/session";
import SubjectModel from "@/models/subject";
import TopicModel from "@/models/topic";
import BoardModel from "@/models/board";
import ExamModel from "@/models/exam";
import QuestionModel from "@/models/question";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("Questions & Taxonomy API (/api/v1/questions, /api/v1/subjects, /api/v1/me/daily-goals)", () => {
  test("GET /api/v1/subjects retorna disciplinas com tópicos em árvore", async () => {
    // 1. Cria disciplina e tópicos
    const subject = await SubjectModel.create({
      name: "Direito Constitucional",
      slug: "direito-constitucional",
      color: "#d4af37",
    });

    const topicParent = await TopicModel.create({
      subject_id: subject.id,
      name: "Direitos Fundamentais",
      slug: "direitos-fundamentais",
    });

    await TopicModel.create({
      subject_id: subject.id,
      parent_id: topicParent.id,
      name: "Remédios Constitucionais",
      slug: "remedios-constitucionais",
    });

    // 2. Consulta API
    const response = await fetch("http://localhost:3000/api/v1/subjects");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    expect(body[0].slug).toBe("direito-constitucional");
    expect(body[0].topics.length).toBe(1); // 1 raiz
    expect(body[0].topics[0].children.length).toBe(1); // 1 filho
  });

  test("GET /api/v1/questions lista questões com filtros e paginação", async () => {
    const subject = await SubjectModel.create({
      name: "Direito Administrativo",
      slug: "direito-administrativo",
    });

    const topic = await TopicModel.create({
      subject_id: subject.id,
      name: "Atos Administrativos",
      slug: "atos-administrativos",
    });

    const board = await BoardModel.create({
      name: "Cebraspe",
      slug: "cebraspe",
      answer_format: "true_false",
    });

    const exam = await ExamModel.create({
      board_id: board.id,
      organ: "BACEN",
      position: "Analista",
      year: 2024,
    });

    await QuestionModel.create({
      exam_id: exam.id,
      number: 1,
      statement: "A autoexecutoriedade é atributo presente em todos os atos administrativos.",
      format: "true_false",
      correct_answer: "E",
      status: "published",
      topic_ids: [topic.id],
      alternatives: [
        { letter: "C", body: "Certo" },
        { letter: "E", body: "Errado" },
      ],
    });

    // Consulta filtrada por disciplina
    const res = await fetch(`http://localhost:3000/api/v1/questions?subject_id=${subject.id}`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.questions.length).toBe(1);
    expect(data.questions[0].correct_answer).toBe("E");
    expect(data.questions[0].alternatives.length).toBe(2);
  });

  test("POST /api/v1/questions/[id]/answers registra resposta e confere gabarito", async () => {
    // 1. Cria usuário e sessão
    const user = await User.create({
      email: "concurseiro@teste.com",
      password: "senha-segura-123",
      display_name: "Concurseiro Focado",
      features: ["read:course"],
    });

    const session = await Session.create(user.id);

    // 2. Cria questão
    const board = await BoardModel.create({
      name: "FGV",
      slug: "fgv",
    });

    const exam = await ExamModel.create({
      board_id: board.id,
      organ: "Receita Federal",
      position: "Auditor",
      year: 2023,
    });

    const q = await QuestionModel.create({
      exam_id: exam.id,
      number: 10,
      statement: "Qual é a capital do Brasil?",
      format: "multiple_choice",
      correct_answer: "B",
      status: "published",
      alternatives: [
        { letter: "A", body: "São Paulo" },
        { letter: "B", body: "Brasília" },
        { letter: "C", body: "Rio de Janeiro" },
      ],
    });

    // 3. Submete resposta correta
    const answerRes = await fetch(`http://localhost:3000/api/v1/questions/${q.id}/answers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${session.token}`,
      },
      body: JSON.stringify({
        chosen: "B",
        guessed: false,
        time_ms: 12000,
      }),
    });

    expect(answerRes.status).toBe(200);
    const answerData = await answerRes.json();
    expect(answerData.is_correct).toBe(true);
    expect(answerData.correct_answer).toBe("B");

    // 4. Submete resposta errada
    const wrongRes = await fetch(`http://localhost:3000/api/v1/questions/${q.id}/answers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${session.token}`,
      },
      body: JSON.stringify({
        chosen: "A",
        guessed: true,
      }),
    });

    expect(wrongRes.status).toBe(200);
    const wrongData = await wrongRes.json();
    expect(wrongData.is_correct).toBe(false);
  });

  test("GET e POST /api/v1/me/daily-goals gerencia metas diárias do estudante", async () => {
    const user = await User.create({
      email: "metas@teste.com",
      password: "senha-segura-123",
      display_name: "Estudante Determinado",
      features: ["read:course"],
    });

    const session = await Session.create(user.id);

    const subject = await SubjectModel.create({
      name: "Língua Portuguesa",
      slug: "lingua-portuguesa",
    });

    // Cria meta de 25 questões por dia
    const postRes = await fetch("http://localhost:3000/api/v1/me/daily-goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${session.token}`,
      },
      body: JSON.stringify({
        subject_id: subject.id,
        target: 25,
      }),
    });

    expect(postRes.status).toBe(200);
    const createdGoal = await postRes.json();
    expect(createdGoal.target).toBe(25);

    // Consulta metas e progresso
    const getRes = await fetch("http://localhost:3000/api/v1/me/daily-goals", {
      headers: {
        Cookie: `session_id=${session.token}`,
      },
    });

    expect(getRes.status).toBe(200);
    const goalsList = await getRes.json();
    expect(goalsList.length).toBe(1);
    expect(goalsList[0].target).toBe(25);
    expect(goalsList[0].answered_today).toBe(0);
    expect(goalsList[0].completed_today).toBe(false);
  });
});
