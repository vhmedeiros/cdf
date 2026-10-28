import database from "@/infra/database";
import { NotFoundError, ValidationError } from "@/infra/errors";

export type ExamStatus = "uploaded" | "extracting" | "review" | "published" | "error";

export interface Exam {
  id: string;
  board_id: string;
  organ: string;
  position: string;
  level: string | null;
  year: number;
  exam_pdf_path: string | null;
  answer_key_pdf_path: string | null;
  source_url: string | null;
  file_hash: string | null;
  status: ExamStatus;
  solved_by_layer: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateExamInput {
  board_id: string;
  organ: string;
  position: string;
  level?: string | null;
  year: number;
  exam_pdf_path?: string | null;
  answer_key_pdf_path?: string | null;
  source_url?: string | null;
  file_hash?: string | null;
  status?: ExamStatus;
  solved_by_layer?: string | null;
}

async function create(input: CreateExamInput): Promise<Exam> {
  const {
    board_id,
    organ,
    position,
    level = null,
    year,
    exam_pdf_path = null,
    answer_key_pdf_path = null,
    source_url = null,
    file_hash = null,
    status = "uploaded",
    solved_by_layer = null,
  } = input;

  if (!board_id) {
    throw new ValidationError({ message: "Banca da prova é obrigatória." });
  }
  if (!organ?.trim()) {
    throw new ValidationError({ message: "Órgão da prova é obrigatório." });
  }
  if (!position?.trim()) {
    throw new ValidationError({ message: "Cargo da prova é obrigatório." });
  }
  if (!year || isNaN(year)) {
    throw new ValidationError({ message: "Ano da prova é obrigatório." });
  }

  const conflictClause = file_hash
    ? `ON CONFLICT (file_hash) DO UPDATE SET
        organ = EXCLUDED.organ,
        position = EXCLUDED.position,
        updated_at = now()`
    : "";

  const query = {
    text: `
      INSERT INTO exams (
        board_id, organ, position, level, year,
        exam_pdf_path, answer_key_pdf_path, source_url, file_hash,
        status, solved_by_layer
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ${conflictClause}
      RETURNING *;
    `,
    values: [
      board_id,
      organ.trim(),
      position.trim(),
      level,
      year,
      exam_pdf_path,
      answer_key_pdf_path,
      source_url,
      file_hash,
      status,
      solved_by_layer,
    ],
  };

  const result = await database.query(query);
  return result.rows[0];
}

async function findById(id: string): Promise<Exam> {
  const query = {
    text: `SELECT * FROM exams WHERE id = $1 LIMIT 1;`,
    values: [id],
  };

  const result = await database.query(query);
  if (result.rowCount === 0) {
    throw new NotFoundError({ message: "Prova não encontrada." });
  }
  return result.rows[0];
}

async function list(filters?: { board_id?: string; organ?: string; year?: number; status?: ExamStatus }): Promise<Exam[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (filters?.board_id) {
    conditions.push(`board_id = $${paramIdx++}`);
    values.push(filters.board_id);
  }
  if (filters?.organ) {
    conditions.push(`organ ILIKE $${paramIdx++}`);
    values.push(`%${filters.organ}%`);
  }
  if (filters?.year) {
    conditions.push(`year = $${paramIdx++}`);
    values.push(filters.year);
  }
  if (filters?.status) {
    conditions.push(`status = $${paramIdx++}`);
    values.push(filters.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const query = {
    text: `SELECT * FROM exams ${whereClause} ORDER BY year DESC, organ ASC, position ASC;`,
    values,
  };

  const result = await database.query(query);
  return result.rows;
}

const ExamModel = {
  create,
  findById,
  list,
};

export default ExamModel;
