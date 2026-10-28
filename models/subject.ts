import database from "@/infra/database";
import { NotFoundError, ValidationError } from "@/infra/errors";

export interface Subject {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSubjectInput {
  name: string;
  slug: string;
  color?: string;
  description?: string | null;
}

async function create(input: CreateSubjectInput): Promise<Subject> {
  const { name, slug, color = "#d4af37", description = null } = input;

  if (!name?.trim()) {
    throw new ValidationError({ message: "Nome da disciplina é obrigatório." });
  }
  if (!slug?.trim()) {
    throw new ValidationError({ message: "Slug da disciplina é obrigatório." });
  }

  const query = {
    text: `
      INSERT INTO subjects (name, slug, color, description)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        color = EXCLUDED.color,
        description = EXCLUDED.description,
        updated_at = now()
      RETURNING *;
    `,
    values: [name.trim(), slug.trim().toLowerCase(), color, description],
  };

  const result = await database.query(query);
  return result.rows[0];
}

async function findBySlug(slug: string): Promise<Subject> {
  const query = {
    text: `SELECT * FROM subjects WHERE slug = $1 LIMIT 1;`,
    values: [slug.trim().toLowerCase()],
  };

  const result = await database.query(query);
  if (result.rowCount === 0) {
    throw new NotFoundError({ message: "Disciplina não encontrada." });
  }
  return result.rows[0];
}

async function findById(id: string): Promise<Subject> {
  const query = {
    text: `SELECT * FROM subjects WHERE id = $1 LIMIT 1;`,
    values: [id],
  };

  const result = await database.query(query);
  if (result.rowCount === 0) {
    throw new NotFoundError({ message: "Disciplina não encontrada." });
  }
  return result.rows[0];
}

async function listAll(): Promise<Subject[]> {
  const query = {
    text: `SELECT * FROM subjects ORDER BY name ASC;`,
  };
  const result = await database.query(query);
  return result.rows;
}

const SubjectModel = {
  create,
  findBySlug,
  findById,
  listAll,
};

export default SubjectModel;
