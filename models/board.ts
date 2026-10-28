import database from "@/infra/database";
import { NotFoundError, ValidationError } from "@/infra/errors";

export type BoardAnswerFormat = "multiple_choice" | "true_false" | "both";

export interface BoardScoring {
  wrong_cancels_right?: boolean;
  penalty_ratio?: number;
}

export interface Board {
  id: string;
  name: string;
  slug: string;
  answer_format: BoardAnswerFormat;
  scoring: BoardScoring;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBoardInput {
  name: string;
  slug: string;
  answer_format?: BoardAnswerFormat;
  scoring?: BoardScoring;
}

async function create(input: CreateBoardInput): Promise<Board> {
  const { name, slug, answer_format = "multiple_choice", scoring = {} } = input;

  if (!name?.trim()) {
    throw new ValidationError({ message: "Nome da banca é obrigatório." });
  }
  if (!slug?.trim()) {
    throw new ValidationError({ message: "Slug da banca é obrigatório." });
  }

  const query = {
    text: `
      INSERT INTO boards (name, slug, answer_format, scoring)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        answer_format = EXCLUDED.answer_format,
        scoring = EXCLUDED.scoring,
        updated_at = now()
      RETURNING *;
    `,
    values: [name.trim(), slug.trim().toLowerCase(), answer_format, JSON.stringify(scoring)],
  };

  const result = await database.query(query);
  return result.rows[0];
}

async function findBySlug(slug: string): Promise<Board> {
  const query = {
    text: `SELECT * FROM boards WHERE slug = $1 LIMIT 1;`,
    values: [slug.trim().toLowerCase()],
  };

  const result = await database.query(query);
  if (result.rowCount === 0) {
    throw new NotFoundError({ message: "Banca examinadora não encontrada." });
  }
  return result.rows[0];
}

async function findById(id: string): Promise<Board> {
  const query = {
    text: `SELECT * FROM boards WHERE id = $1 LIMIT 1;`,
    values: [id],
  };

  const result = await database.query(query);
  if (result.rowCount === 0) {
    throw new NotFoundError({ message: "Banca examinadora não encontrada." });
  }
  return result.rows[0];
}

async function listAll(): Promise<Board[]> {
  const query = {
    text: `SELECT * FROM boards ORDER BY name ASC;`,
  };
  const result = await database.query(query);
  return result.rows;
}

const BoardModel = {
  create,
  findBySlug,
  findById,
  listAll,
};

export default BoardModel;
