import database from "@/infra/database";
import { NotFoundError, ValidationError } from "@/infra/errors";

export interface Subject {
  id: string;
  course_id?: string | null;
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
  course_id?: string | null;
}

export interface ListSubjectsFilter {
  course_id?: string | null;
}

async function create(input: CreateSubjectInput): Promise<Subject> {
  const { name, slug, color = "#d4af37", description = null, course_id = null } = input;

  if (!name?.trim()) {
    throw new ValidationError({ message: "Nome da disciplina é obrigatório." });
  }
  if (!slug?.trim()) {
    throw new ValidationError({ message: "Slug da disciplina é obrigatório." });
  }

  const query = {
    text: `
      INSERT INTO subjects (name, slug, color, description, course_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        color = EXCLUDED.color,
        description = EXCLUDED.description,
        course_id = EXCLUDED.course_id,
        updated_at = now()
      RETURNING *;
    `,
    values: [name.trim(), slug.trim().toLowerCase(), color, description, course_id],
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

async function listAll(filter?: ListSubjectsFilter): Promise<Subject[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (filter?.course_id !== undefined) {
    if (filter.course_id === null || filter.course_id === "general") {
      conditions.push("course_id IS NULL");
    } else {
      conditions.push(`course_id = $${paramIdx++}`);
      values.push(filter.course_id);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const query = {
    text: `SELECT * FROM subjects ${whereClause} ORDER BY name ASC;`,
    values,
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
