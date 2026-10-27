import database from "@/infra/database";
import { NotFoundError } from "@/infra/errors";
import { z } from "zod";

export const createNoteSchema = z.object({
  material_id: z.string().uuid(),
  timestamp_seconds: z.number().min(0).nullable().optional(),
  body: z.string().trim().min(1, "O texto da anotação não pode ficar em branco."),
  is_important: z.boolean().optional().default(false),
});

export const updateNoteSchema = z.object({
  body: z.string().trim().min(1, "O texto da anotação não pode ficar em branco.").optional(),
  timestamp_seconds: z.number().min(0).nullable().optional(),
  is_important: z.boolean().optional(),
});

export const listNotesQuerySchema = z.object({
  course_id: z.string().uuid().optional(),
  material_id: z.string().uuid().optional(),
  important: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
  q: z.string().optional(),
});

export type Note = {
  id: string;
  user_id: string;
  material_id: string;
  course_id: string;
  timestamp_seconds: number | null;
  body: string;
  is_important: boolean;
  created_at: Date;
  updated_at: Date;
  material_title?: string;
  lesson_title?: string;
  module_title?: string;
};

async function create(
  userId: string,
  data: {
    materialId: string;
    timestampSeconds?: number | null;
    body: string;
    isImportant?: boolean;
  },
): Promise<Note> {
  // 1. Busca material para obter course_id
  const matRes = await database.query<{ id: string; course_id: string }>(
    `SELECT m.id, mod.course_id
     FROM materials m
     INNER JOIN lessons l ON l.id = m.lesson_id
     INNER JOIN modules mod ON mod.id = l.module_id
     WHERE m.id = $1
     LIMIT 1`,
    [data.materialId],
  );

  const mat = matRes.rows[0];
  if (!mat) {
    throw new NotFoundError({ message: "Material não encontrado." });
  }

  const result = await database.query<Note>(
    `INSERT INTO notes (
       user_id,
       material_id,
       course_id,
       timestamp_seconds,
       body,
       is_important
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      data.materialId,
      mat.course_id,
      data.timestampSeconds !== undefined ? data.timestampSeconds : null,
      data.body,
      Boolean(data.isImportant),
    ],
  );

  const row = result.rows[0];
  return {
    ...row,
    timestamp_seconds:
      row.timestamp_seconds !== null ? parseFloat(row.timestamp_seconds as any) : null,
  };
}

async function update(
  userId: string,
  noteId: string,
  data: {
    body?: string;
    timestampSeconds?: number | null;
    isImportant?: boolean;
  },
): Promise<Note> {
  const existing = await findById(userId, noteId);
  if (!existing) {
    throw new NotFoundError({ message: "Anotação não encontrada." });
  }

  const nextBody = data.body !== undefined ? data.body : existing.body;
  const nextTimestamp =
    data.timestampSeconds !== undefined ? data.timestampSeconds : existing.timestamp_seconds;
  const nextImportant = data.isImportant !== undefined ? data.isImportant : existing.is_important;

  const result = await database.query<Note>(
    `UPDATE notes
     SET body = $1, timestamp_seconds = $2, is_important = $3, updated_at = now()
     WHERE id = $4 AND user_id = $5
     RETURNING *`,
    [nextBody, nextTimestamp, nextImportant, noteId, userId],
  );

  const row = result.rows[0];
  return {
    ...row,
    timestamp_seconds:
      row.timestamp_seconds !== null ? parseFloat(row.timestamp_seconds as any) : null,
  };
}

async function deleteNote(userId: string, noteId: string): Promise<void> {
  const result = await database.query(`DELETE FROM notes WHERE id = $1 AND user_id = $2`, [
    noteId,
    userId,
  ]);

  if (result.rowCount === 0) {
    throw new NotFoundError({ message: "Anotação não encontrada." });
  }
}

async function findById(userId: string, noteId: string): Promise<Note | null> {
  const result = await database.query<Note>(
    `SELECT n.*, m.title as material_title, l.title as lesson_title, mod.title as module_title
     FROM notes n
     INNER JOIN materials m ON m.id = n.material_id
     INNER JOIN lessons l ON l.id = m.lesson_id
     INNER JOIN modules mod ON mod.id = l.module_id
     WHERE n.id = $1 AND n.user_id = $2
     LIMIT 1`,
    [noteId, userId],
  );

  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    ...row,
    timestamp_seconds:
      row.timestamp_seconds !== null ? parseFloat(row.timestamp_seconds as any) : null,
  };
}

async function list(
  userId: string,
  filters: {
    courseId?: string;
    materialId?: string;
    isImportant?: boolean;
    q?: string;
  } = {},
): Promise<Note[]> {
  const conditions: string[] = ["n.user_id = $1"];
  const values: any[] = [userId];
  let paramIdx = 2;

  if (filters.courseId) {
    conditions.push(`n.course_id = $${paramIdx++}`);
    values.push(filters.courseId);
  }

  if (filters.materialId) {
    conditions.push(`n.material_id = $${paramIdx++}`);
    values.push(filters.materialId);
  }

  if (filters.isImportant) {
    conditions.push(`n.is_important = true`);
  }

  if (filters.q && filters.q.trim()) {
    conditions.push(`n.body ILIKE $${paramIdx++}`);
    values.push(`%${filters.q.trim()}%`);
  }

  const result = await database.query<Note>(
    `SELECT n.*, m.title as material_title, l.title as lesson_title, mod.title as module_title
     FROM notes n
     INNER JOIN materials m ON m.id = n.material_id
     INNER JOIN lessons l ON l.id = m.lesson_id
     INNER JOIN modules mod ON mod.id = l.module_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY n.timestamp_seconds ASC NULLS LAST, n.created_at DESC`,
    values,
  );

  return result.rows.map((row) => ({
    ...row,
    timestamp_seconds:
      row.timestamp_seconds !== null ? parseFloat(row.timestamp_seconds as any) : null,
  }));
}

const NoteModel = {
  create,
  update,
  delete: deleteNote,
  findById,
  list,
};

export default NoteModel;
