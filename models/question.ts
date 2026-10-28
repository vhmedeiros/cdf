import database from "@/infra/database";
import { NotFoundError, ValidationError } from "@/infra/errors";

export type QuestionFormat = "multiple_choice" | "true_false";
export type QuestionStatus = "draft" | "reviewed" | "published";
export type QuestionOrigin = "official" | "ai_generated";

export interface Alternative {
  id: string;
  question_id: string;
  letter: string;
  body: string;
  created_at: Date;
}

export interface SupportText {
  id: string;
  exam_id: string;
  label: string;
  body: string;
  image_path: string | null;
  created_at: Date;
}

export interface QuestionExplanation {
  id: string;
  question_id: string;
  body: string;
  per_alternative: Record<string, string>;
  model: string;
  prompt_version: string;
  rating_up: number;
  rating_down: number;
  created_at: Date;
  updated_at: Date;
}

export interface Question {
  id: string;
  exam_id: string | null;
  number: number;
  statement: string;
  support_text_id: string | null;
  image_paths: string[];
  format: QuestionFormat;
  correct_answer: string;
  status: QuestionStatus;
  is_annulled: boolean;
  origin: QuestionOrigin;
  difficulty: number | null;
  embedding?: string | null;
  ai_disagrees: boolean;
  extraction_confidence: number;
  created_at: Date;
  updated_at: Date;
  // Joins e agregados
  alternatives?: Alternative[];
  support_text?: SupportText | null;
  explanation?: QuestionExplanation | null;
  topics?: Array<{ id: string; name: string; slug: string; subject_id: string; subject_name: string }>;
  exam?: {
    id: string;
    organ: string;
    position: string;
    year: number;
    board_name: string;
  } | null;
  user_answer?: {
    chosen: string;
    is_correct: boolean;
    guessed: boolean;
    created_at: Date;
  } | null;
}

export interface CreateQuestionInput {
  exam_id?: string | null;
  number: number;
  statement: string;
  support_text_id?: string | null;
  image_paths?: string[];
  format: QuestionFormat;
  correct_answer: string;
  status?: QuestionStatus;
  is_annulled?: boolean;
  origin?: QuestionOrigin;
  difficulty?: number | null;
  ai_disagrees?: boolean;
  extraction_confidence?: number;
  alternatives?: Array<{ letter: string; body: string }>;
  topic_ids?: string[];
}

async function create(input: CreateQuestionInput): Promise<Question> {
  const {
    exam_id = null,
    number,
    statement,
    support_text_id = null,
    image_paths = [],
    format,
    correct_answer,
    status = "published",
    is_annulled = false,
    origin = "official",
    difficulty = null,
    ai_disagrees = false,
    extraction_confidence = 1.0,
    alternatives = [],
    topic_ids = [],
  } = input;

  if (!statement?.trim()) {
    throw new ValidationError({ message: "Enunciado da questão é obrigatório." });
  }
  if (!correct_answer?.trim()) {
    throw new ValidationError({ message: "Gabarito da questão é obrigatório." });
  }

  // 1. Inserir a questão
  const insertQuestionQuery = {
    text: `
      INSERT INTO questions (
        exam_id, number, statement, support_text_id, image_paths,
        format, correct_answer, status, is_annulled, origin,
        difficulty, ai_disagrees, extraction_confidence
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `,
    values: [
      exam_id,
      number,
      statement.trim(),
      support_text_id,
      image_paths,
      format,
      correct_answer.trim().toUpperCase(),
      status,
      is_annulled,
      origin,
      difficulty,
      ai_disagrees,
      extraction_confidence,
    ],
  };

  const questionResult = await database.query(insertQuestionQuery);
  const createdQuestion = questionResult.rows[0];

  // 2. Inserir alternativas
  const createdAlternatives: Alternative[] = [];
  for (const alt of alternatives) {
    const insertAltQuery = {
      text: `
        INSERT INTO alternatives (question_id, letter, body)
        VALUES ($1, $2, $3)
        RETURNING *;
      `,
      values: [createdQuestion.id, alt.letter.trim().toUpperCase(), alt.body.trim()],
    };
    const altRes = await database.query(insertAltQuery);
    createdAlternatives.push(altRes.rows[0]);
  }

  // 3. Vincular tópicos
  for (const topicId of topic_ids) {
    await database.query({
      text: `
        INSERT INTO question_topics (question_id, topic_id, source)
        VALUES ($1, $2, 'admin')
        ON CONFLICT DO NOTHING;
      `,
      values: [createdQuestion.id, topicId],
    });
  }

  return {
    ...createdQuestion,
    alternatives: createdAlternatives,
  };
}

async function findById(id: string, userId?: string): Promise<Question> {
  const query = {
    text: `
      SELECT 
        q.*,
        row_to_json(e.*) as exam_json,
        row_to_json(b.*) as board_json,
        row_to_json(st.*) as support_text_json,
        row_to_json(exp.*) as explanation_json
      FROM questions q
      LEFT JOIN exams e ON q.exam_id = e.id
      LEFT JOIN boards b ON e.board_id = b.id
      LEFT JOIN support_texts st ON q.support_text_id = st.id
      LEFT JOIN explanations exp ON exp.question_id = q.id
      WHERE q.id = $1
      LIMIT 1;
    `,
    values: [id],
  };

  const result = await database.query(query);
  if (result.rowCount === 0) {
    throw new NotFoundError({ message: "Questão não encontrada." });
  }

  const row = result.rows[0];

  // Carrega alternativas
  const altsResult = await database.query({
    text: `SELECT * FROM alternatives WHERE question_id = $1 ORDER BY letter ASC;`,
    values: [id],
  });

  // Carrega tópicos
  const topicsResult = await database.query({
    text: `
      SELECT t.id, t.name, t.slug, s.id as subject_id, s.name as subject_name
      FROM question_topics qt
      JOIN topics t ON qt.topic_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      WHERE qt.question_id = $1;
    `,
    values: [id],
  });

  let userAnswer = null;
  if (userId) {
    const ansResult = await database.query({
      text: `SELECT chosen, is_correct, guessed, created_at FROM answers WHERE user_id = $1 AND question_id = $2 ORDER BY created_at DESC LIMIT 1;`,
      values: [userId, id],
    });
    if (ansResult.rowCount > 0) {
      userAnswer = ansResult.rows[0];
    }
  }

  return {
    ...row,
    alternatives: altsResult.rows,
    support_text: row.support_text_json,
    explanation: row.explanation_json,
    topics: topicsResult.rows,
    exam: row.exam_json
      ? {
          id: row.exam_json.id,
          organ: row.exam_json.organ,
          position: row.exam_json.position,
          year: row.exam_json.year,
          board_name: row.board_json?.name || "",
        }
      : null,
    user_answer: userAnswer,
  };
}

export interface ListQuestionsFilter {
  subject_id?: string;
  topic_id?: string;
  board_id?: string;
  organ?: string;
  year?: number;
  format?: QuestionFormat;
  status?: QuestionStatus;
  origin?: QuestionOrigin;
  userId?: string;
  only_unanswered?: boolean;
  limit?: number;
  offset?: number;
}

async function list(filters: ListQuestionsFilter = {}): Promise<{ questions: Question[]; total: number }> {
  const {
    subject_id,
    topic_id,
    board_id,
    organ,
    year,
    format,
    status = "published",
    origin,
    userId,
    only_unanswered = false,
    limit = 20,
    offset = 0,
  } = filters;

  const conditions: string[] = ["q.status = $1"];
  const values: any[] = [status];
  let paramIdx = 2;

  if (origin) {
    conditions.push(`q.origin = $${paramIdx++}`);
    values.push(origin);
  }
  if (format) {
    conditions.push(`q.format = $${paramIdx++}`);
    values.push(format);
  }
  if (board_id) {
    conditions.push(`e.board_id = $${paramIdx++}`);
    values.push(board_id);
  }
  if (organ) {
    conditions.push(`e.organ ILIKE $${paramIdx++}`);
    values.push(`%${organ}%`);
  }
  if (year) {
    conditions.push(`e.year = $${paramIdx++}`);
    values.push(year);
  }
  if (topic_id) {
    conditions.push(`EXISTS (SELECT 1 FROM question_topics qt WHERE qt.question_id = q.id AND qt.topic_id = $${paramIdx++})`);
    values.push(topic_id);
  } else if (subject_id) {
    conditions.push(`EXISTS (
      SELECT 1 FROM question_topics qt
      JOIN topics t ON qt.topic_id = t.id
      WHERE qt.question_id = q.id AND t.subject_id = $${paramIdx++}
    )`);
    values.push(subject_id);
  }

  if (only_unanswered && userId) {
    conditions.push(`NOT EXISTS (SELECT 1 FROM answers a WHERE a.question_id = q.id AND a.user_id = $${paramIdx++})`);
    values.push(userId);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  // Contagem total
  const countQuery = {
    text: `
      SELECT COUNT(DISTINCT q.id) as total
      FROM questions q
      LEFT JOIN exams e ON q.exam_id = e.id
      ${whereClause};
    `,
    values,
  };
  const countResult = await database.query(countQuery);
  const total = parseInt(countResult.rows[0]?.total || "0", 10);

  // Consulta paginada
  const query = {
    text: `
      SELECT 
        q.*,
        row_to_json(e.*) as exam_json,
        row_to_json(b.*) as board_json
      FROM questions q
      LEFT JOIN exams e ON q.exam_id = e.id
      LEFT JOIN boards b ON e.board_id = b.id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++};
    `,
    values: [...values, limit, offset],
  };

  const result = await database.query(query);

  const questionIds = result.rows.map((r) => r.id);
  let allAlternatives: Alternative[] = [];
  if (questionIds.length > 0) {
    const altsRes = await database.query({
      text: `SELECT * FROM alternatives WHERE question_id = ANY($1) ORDER BY letter ASC;`,
      values: [questionIds],
    });
    allAlternatives = altsRes.rows;
  }

  const questions: Question[] = result.rows.map((row) => ({
    ...row,
    alternatives: allAlternatives.filter((a) => a.question_id === row.id),
    exam: row.exam_json
      ? {
          id: row.exam_json.id,
          organ: row.exam_json.organ,
          position: row.exam_json.position,
          year: row.exam_json.year,
          board_name: row.board_json?.name || "",
        }
      : null,
  }));

  return { questions, total };
}

export interface RecordAnswerInput {
  user_id: string;
  question_id: string;
  chosen: string;
  guessed?: boolean;
  time_ms?: number;
  context?: "free" | "lesson" | "simulado" | "review";
  lesson_id?: string | null;
  simulado_id?: string | null;
}

async function recordAnswer(input: RecordAnswerInput): Promise<{
  id: string;
  is_correct: boolean;
  correct_answer: string;
  explanation: QuestionExplanation | null;
}> {
  const {
    user_id,
    question_id,
    chosen,
    guessed = false,
    time_ms = 0,
    context = "free",
    lesson_id = null,
    simulado_id = null,
  } = input;

  if (!chosen?.trim()) {
    throw new ValidationError({ message: "Alternativa escolhida é obrigatória." });
  }

  // 1. Busca questão e gabarito oficial
  const questionRes = await database.query({
    text: `SELECT id, correct_answer FROM questions WHERE id = $1 LIMIT 1;`,
    values: [question_id],
  });
  if (questionRes.rowCount === 0) {
    throw new NotFoundError({ message: "Questão não encontrada." });
  }

  const question = questionRes.rows[0];
  const is_correct = chosen.trim().toUpperCase() === question.correct_answer.toUpperCase();

  // 2. Grava a resposta
  const insertAnswerQuery = {
    text: `
      INSERT INTO answers (
        user_id, question_id, chosen, is_correct, guessed,
        time_ms, context, lesson_id, simulado_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `,
    values: [
      user_id,
      question_id,
      chosen.trim().toUpperCase(),
      is_correct,
      guessed,
      time_ms,
      context,
      lesson_id,
      simulado_id,
    ],
  };

  const answerResult = await database.query(insertAnswerQuery);

  // 3. Busca explicação se já houver
  const expRes = await database.query({
    text: `SELECT * FROM explanations WHERE question_id = $1 LIMIT 1;`,
    values: [question_id],
  });
  const explanation = expRes.rowCount > 0 ? expRes.rows[0] : null;

  return {
    id: answerResult.rows[0].id,
    is_correct,
    correct_answer: question.correct_answer,
    explanation,
  };
}

const QuestionModel = {
  create,
  findById,
  list,
  recordAnswer,
};

export default QuestionModel;
