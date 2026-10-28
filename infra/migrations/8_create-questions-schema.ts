import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Extensão pgvector para busca por similaridade e deduplicação semântica
  pgm.sql("CREATE EXTENSION IF NOT EXISTS vector;");

  // 2. Disciplinas (subjects)
  pgm.createTable("subjects", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: {
      type: "varchar(150)",
      notNull: true,
    },
    slug: {
      type: "varchar(150)",
      notNull: true,
      unique: true,
    },
    color: {
      type: "varchar(30)",
      notNull: true,
      default: "#d4af37",
    },
    description: {
      type: "text",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // 3. Assuntos / Tópicos (topics - hierarquia em árvore)
  pgm.createTable("topics", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    subject_id: {
      type: "uuid",
      notNull: true,
      references: "subjects",
      onDelete: "CASCADE",
    },
    parent_id: {
      type: "uuid",
      references: "topics",
      onDelete: "CASCADE",
    },
    name: {
      type: "varchar(255)",
      notNull: true,
    },
    slug: {
      type: "varchar(255)",
      notNull: true,
    },
    aliases: {
      type: "text[]",
      notNull: true,
      default: "{}",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint("topics", "topics_subject_slug_unique", {
    unique: ["subject_id", "slug"],
  });
  pgm.createIndex("topics", ["subject_id"]);
  pgm.createIndex("topics", ["parent_id"]);

  // 4. Bancas Examinadoras (boards)
  pgm.createTable("boards", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: {
      type: "varchar(150)",
      notNull: true,
    },
    slug: {
      type: "varchar(150)",
      notNull: true,
      unique: true,
    },
    answer_format: {
      type: "varchar(30)",
      notNull: true,
      default: "multiple_choice",
      check: "answer_format IN ('multiple_choice', 'true_false', 'both')",
    },
    scoring: {
      type: "jsonb",
      notNull: true,
      default: "{}",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // 5. Provas Oficiais (exams)
  pgm.createTable("exams", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    board_id: {
      type: "uuid",
      notNull: true,
      references: "boards",
      onDelete: "RESTRICT",
    },
    organ: {
      type: "varchar(150)",
      notNull: true,
    },
    position: {
      type: "varchar(150)",
      notNull: true,
    },
    level: {
      type: "varchar(50)",
    },
    year: {
      type: "integer",
      notNull: true,
    },
    exam_pdf_path: {
      type: "text",
    },
    answer_key_pdf_path: {
      type: "text",
    },
    source_url: {
      type: "text",
    },
    file_hash: {
      type: "varchar(64)",
      unique: true,
    },
    status: {
      type: "varchar(30)",
      notNull: true,
      default: "uploaded",
      check: "status IN ('uploaded', 'extracting', 'review', 'published', 'error')",
    },
    solved_by_layer: {
      type: "varchar(30)",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("exams", ["board_id"]);
  pgm.createIndex("exams", ["year"]);
  pgm.createIndex("exams", ["status"]);

  // 6. Textos de Apoio (support_texts)
  pgm.createTable("support_texts", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    exam_id: {
      type: "uuid",
      notNull: true,
      references: "exams",
      onDelete: "CASCADE",
    },
    label: {
      type: "varchar(100)",
      notNull: true,
    },
    body: {
      type: "text",
      notNull: true,
    },
    image_path: {
      type: "text",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("support_texts", ["exam_id"]);

  // 7. Questões (questions)
  pgm.createTable("questions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    exam_id: {
      type: "uuid",
      references: "exams",
      onDelete: "CASCADE",
    },
    number: {
      type: "integer",
      notNull: true,
    },
    statement: {
      type: "text",
      notNull: true,
    },
    support_text_id: {
      type: "uuid",
      references: "support_texts",
      onDelete: "SET NULL",
    },
    image_paths: {
      type: "text[]",
      notNull: true,
      default: "{}",
    },
    format: {
      type: "varchar(30)",
      notNull: true,
      check: "format IN ('multiple_choice', 'true_false')",
    },
    correct_answer: {
      type: "varchar(10)",
      notNull: true,
    },
    status: {
      type: "varchar(30)",
      notNull: true,
      default: "draft",
      check: "status IN ('draft', 'reviewed', 'published')",
    },
    is_annulled: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    origin: {
      type: "varchar(30)",
      notNull: true,
      default: "official",
      check: "origin IN ('official', 'ai_generated')",
    },
    difficulty: {
      type: "real",
    },
    embedding: {
      type: "vector(768)",
    },
    ai_disagrees: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    extraction_confidence: {
      type: "real",
      default: 1.0,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("questions", ["exam_id"]);
  pgm.createIndex("questions", ["status"]);
  pgm.createIndex("questions", ["origin"]);
  pgm.createIndex("questions", ["is_annulled"]);

  // 8. Alternativas (alternatives)
  pgm.createTable("alternatives", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    question_id: {
      type: "uuid",
      notNull: true,
      references: "questions",
      onDelete: "CASCADE",
    },
    letter: {
      type: "varchar(5)",
      notNull: true,
    },
    body: {
      type: "text",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint("alternatives", "alternatives_question_letter_unique", {
    unique: ["question_id", "letter"],
  });
  pgm.createIndex("alternatives", ["question_id"]);

  // 9. Relação Questão <-> Assunto (question_topics)
  pgm.createTable("question_topics", {
    question_id: {
      type: "uuid",
      notNull: true,
      references: "questions",
      onDelete: "CASCADE",
    },
    topic_id: {
      type: "uuid",
      notNull: true,
      references: "topics",
      onDelete: "CASCADE",
    },
    confidence: {
      type: "real",
      default: 1.0,
    },
    source: {
      type: "varchar(20)",
      notNull: true,
      default: "admin",
      check: "source IN ('ai', 'admin')",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint("question_topics", "question_topics_pk", {
    primaryKey: ["question_id", "topic_id"],
  });
  pgm.createIndex("question_topics", ["topic_id"]);

  // 10. Explicações Oficiais / Pedagógicas (explanations)
  pgm.createTable("explanations", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    question_id: {
      type: "uuid",
      notNull: true,
      unique: true,
      references: "questions",
      onDelete: "CASCADE",
    },
    body: {
      type: "text",
      notNull: true,
    },
    per_alternative: {
      type: "jsonb",
      notNull: true,
      default: "{}",
    },
    model: {
      type: "varchar(50)",
      notNull: true,
    },
    prompt_version: {
      type: "varchar(20)",
      notNull: true,
      default: "v1",
    },
    rating_up: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    rating_down: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // 11. Respostas dos Usuários (answers)
  pgm.createTable("answers", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "CASCADE",
    },
    question_id: {
      type: "uuid",
      notNull: true,
      references: "questions",
      onDelete: "CASCADE",
    },
    chosen: {
      type: "varchar(10)",
      notNull: true,
    },
    is_correct: {
      type: "boolean",
      notNull: true,
    },
    guessed: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    time_ms: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    context: {
      type: "varchar(30)",
      notNull: true,
      default: "free",
      check: "context IN ('free', 'lesson', 'simulado', 'review')",
    },
    lesson_id: {
      type: "uuid",
      references: "lessons",
      onDelete: "SET NULL",
    },
    simulado_id: {
      type: "uuid",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("answers", ["user_id", "created_at"]);
  pgm.createIndex("answers", ["question_id", "is_correct"]);
  pgm.createIndex("answers", ["user_id", "question_id"]);

  // 12. Metas Diárias de Questões (daily_goals)
  pgm.createTable("daily_goals", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "CASCADE",
    },
    subject_id: {
      type: "uuid",
      notNull: true,
      references: "subjects",
      onDelete: "CASCADE",
    },
    target: {
      type: "integer",
      notNull: true,
      default: 20,
    },
    active_weekdays: {
      type: "integer[]",
      notNull: true,
      default: "{1,2,3,4,5,6,7}",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint("daily_goals", "daily_goals_user_subject_unique", {
    unique: ["user_id", "subject_id"],
  });
  pgm.createIndex("daily_goals", ["user_id"]);

  // 13. Integração Aula <-> Assunto de Concurso (lesson_topics)
  pgm.createTable("lesson_topics", {
    lesson_id: {
      type: "uuid",
      notNull: true,
      references: "lessons",
      onDelete: "CASCADE",
    },
    topic_id: {
      type: "uuid",
      notNull: true,
      references: "topics",
      onDelete: "CASCADE",
    },
    confidence: {
      type: "real",
      default: 1.0,
    },
    source: {
      type: "varchar(20)",
      notNull: true,
      default: "admin",
      check: "source IN ('ai', 'admin')",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint("lesson_topics", "lesson_topics_pk", {
    primaryKey: ["lesson_id", "topic_id"],
  });

  // 14. Jobs de IA (ai_jobs)
  pgm.createTable("ai_jobs", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    kind: {
      type: "varchar(50)",
      notNull: true,
    },
    model: {
      type: "varchar(50)",
      notNull: true,
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "pending",
      check: "status IN ('pending', 'running', 'completed', 'failed', 'quota_exceeded')",
    },
    attempts: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    tokens_in: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    tokens_out: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    payload_ref: {
      type: "jsonb",
      default: "{}",
    },
    error: {
      type: "text",
    },
    scheduled_for: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("ai_jobs", ["status", "scheduled_for"]);
  pgm.createIndex("ai_jobs", ["kind"]);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("ai_jobs");
  pgm.dropTable("lesson_topics");
  pgm.dropTable("daily_goals");
  pgm.dropTable("answers");
  pgm.dropTable("explanations");
  pgm.dropTable("question_topics");
  pgm.dropTable("alternatives");
  pgm.dropTable("questions");
  pgm.dropTable("support_texts");
  pgm.dropTable("exams");
  pgm.dropTable("boards");
  pgm.dropTable("topics");
  pgm.dropTable("subjects");
}
