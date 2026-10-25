import database from "@/infra/database";
import { NotFoundError, ValidationError } from "@/infra/errors";
import { ParsedTree } from "@/services/drive/buildTree";

export type CourseStatus = "draft" | "published" | "archived";
export type LessonStrategy = "auto" | "folders" | "files";
export type SyncStatus = "idle" | "queued" | "running" | "ok" | "error";

export type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  drive_url: string;
  drive_folder_id: string;
  cover_url: string | null;
  accent_color: string | null;
  status: CourseStatus;
  lesson_strategy: LessonStrategy;
  sync_status: SyncStatus;
  sync_error: string | null;
  last_synced_at: Date | null;
  drive_changes_token: string | null;
  total_duration_seconds: number;
  materials_count: number;
  created_at: Date;
  updated_at: Date;
};

export type CourseTree = Course & {
  modules: Array<{
    id: string;
    title: string;
    position: number;
    lessons: Array<{
      id: string;
      title: string;
      position: number;
      duration_seconds: number;
      materials: Array<{
        id: string;
        drive_file_id: string;
        title: string;
        kind: string;
        mime: string;
        size_bytes: number;
        duration_seconds: number;
        position: number;
      }>;
    }>;
  }>;
};

type CreateCourseInput = {
  title: string;
  slug: string;
  description?: string | null;
  driveUrl: string;
  driveFolderId: string;
  lessonStrategy?: LessonStrategy;
  status?: CourseStatus;
};

async function create(input: CreateCourseInput): Promise<Course> {
  const {
    title,
    slug,
    description = null,
    driveUrl,
    driveFolderId,
    lessonStrategy = "auto",
    status = "draft",
  } = input;

  const result = await database.query<Course>(
    `INSERT INTO courses (
      title, slug, description, drive_url, drive_folder_id, lesson_strategy, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [title, slug, description, driveUrl, driveFolderId, lessonStrategy, status],
  );

  return result.rows[0];
}

async function findById(id: string): Promise<Course | null> {
  const result = await database.query<Course>(`SELECT * FROM courses WHERE id = $1 LIMIT 1`, [id]);
  return result.rows[0] ?? null;
}

async function findBySlug(slug: string): Promise<Course | null> {
  const result = await database.query<Course>(`SELECT * FROM courses WHERE slug = $1 LIMIT 1`, [
    slug,
  ]);
  return result.rows[0] ?? null;
}

async function findAll(): Promise<Course[]> {
  const result = await database.query<Course>(`SELECT * FROM courses ORDER BY created_at DESC`);
  return result.rows;
}

async function findEnrolledByUser(userId: string): Promise<Course[]> {
  const result = await database.query<Course>(
    `SELECT c.*
     FROM courses c
     INNER JOIN enrollments e ON e.course_id = c.id
     WHERE e.user_id = $1
       AND c.status = 'published'
       AND (e.expires_at IS NULL OR e.expires_at > now())
     ORDER BY c.title ASC`,
    [userId],
  );
  return result.rows;
}

/**
 * Carrega a árvore completa de um curso em no máximo 4 queries (sem problema N+1).
 */
async function getTree(courseId: string): Promise<CourseTree | null> {
  const course = await findById(courseId);
  if (!course) return null;

  // 1. Módulos do curso
  const modulesResult = await database.query(
    `SELECT id, title, position
     FROM modules
     WHERE course_id = $1 AND is_active = true
     ORDER BY position ASC`,
    [courseId],
  );
  const modules = modulesResult.rows;
  if (modules.length === 0) {
    return { ...course, modules: [] };
  }

  const moduleIds = modules.map((m) => m.id);

  // 2. Aulas de todos os módulos
  const lessonsResult = await database.query(
    `SELECT id, module_id, title, position, duration_seconds
     FROM lessons
     WHERE module_id = ANY($1::uuid[]) AND is_active = true
     ORDER BY position ASC`,
    [moduleIds],
  );
  const lessons = lessonsResult.rows;
  const lessonIds = lessons.map((l) => l.id);

  // 3. Materiais de todas as aulas
  let materials: any[] = [];
  if (lessonIds.length > 0) {
    const materialsResult = await database.query(
      `SELECT id, lesson_id, drive_file_id, title, kind, mime, size_bytes, duration_seconds, position
       FROM materials
       WHERE lesson_id = ANY($1::uuid[]) AND is_active = true
       ORDER BY position ASC`,
      [lessonIds],
    );
    materials = materialsResult.rows;
  }

  // Agrupa materiais por lesson_id
  const materialsByLesson = new Map<string, any[]>();
  for (const mat of materials) {
    if (!materialsByLesson.has(mat.lesson_id)) {
      materialsByLesson.set(mat.lesson_id, []);
    }
    materialsByLesson.get(mat.lesson_id)!.push({
      id: mat.id,
      drive_file_id: mat.drive_file_id,
      title: mat.title,
      kind: mat.kind,
      mime: mat.mime,
      size_bytes: Number(mat.size_bytes),
      duration_seconds: mat.duration_seconds,
      position: mat.position,
    });
  }

  // Agrupa aulas por module_id
  const lessonsByModule = new Map<string, any[]>();
  for (const les of lessons) {
    if (!lessonsByModule.has(les.module_id)) {
      lessonsByModule.set(les.module_id, []);
    }
    lessonsByModule.get(les.module_id)!.push({
      id: les.id,
      title: les.title,
      position: les.position,
      duration_seconds: les.duration_seconds,
      materials: materialsByLesson.get(les.id) || [],
    });
  }

  return {
    ...course,
    modules: modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      position: mod.position,
      lessons: lessonsByModule.get(mod.id) || [],
    })),
  };
}

/**
 * Aplica o resultado da função pura buildTree ao banco de dados dentro de uma transação.
 * Idempotente com soft delete.
 */
async function syncTreeToDatabase(courseId: string, tree: ParsedTree): Promise<void> {
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN;");

    // 1. Atualiza métricas do curso
    await client.query(
      `UPDATE courses
       SET total_duration_seconds = $1,
           materials_count = $2,
           sync_status = 'ok',
           sync_error = null,
           last_synced_at = now(),
           updated_at = now()
       WHERE id = $3`,
      [tree.totalDurationSeconds, tree.materialsCount, courseId],
    );

    // 2. Itera sobre módulos, aulas e materiais inserindo / atualizando
    for (const mod of tree.modules) {
      const modRes = await client.query(
        `INSERT INTO modules (course_id, drive_folder_id, raw_name, title, position, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [courseId, mod.driveFolderId, mod.rawName, mod.title, mod.position],
      );

      // Se já existia ou novo, busca o id
      let moduleId = modRes.rows[0]?.id;
      if (!moduleId) {
        const findMod = await client.query(
          `SELECT id FROM modules WHERE course_id = $1 AND raw_name = $2 LIMIT 1`,
          [courseId, mod.rawName],
        );
        moduleId = findMod.rows[0]?.id;
      }

      for (const les of mod.lessons) {
        const lesRes = await client.query(
          `INSERT INTO lessons (module_id, drive_folder_id, raw_name, title, position, duration_seconds, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true)
           RETURNING id`,
          [moduleId, les.driveFolderId, les.rawName, les.title, les.position, les.durationSeconds],
        );
        const lessonId = lesRes.rows[0]?.id;

        for (const mat of les.materials) {
          await client.query(
            `INSERT INTO materials (
              lesson_id, drive_file_id, raw_name, title, kind, mime, size_bytes, duration_seconds, md5, drive_modified_time, position, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
            ON CONFLICT (drive_file_id) DO UPDATE SET
              lesson_id = EXCLUDED.lesson_id,
              title = EXCLUDED.title,
              position = EXCLUDED.position,
              duration_seconds = EXCLUDED.duration_seconds,
              is_active = true,
              updated_at = now()`,
            [
              lessonId,
              mat.driveFileId,
              mat.rawName,
              mat.title,
              mat.kind,
              mat.mime,
              mat.sizeBytes,
              mat.durationSeconds,
              mat.md5,
              mat.driveModifiedTime,
              mat.position,
            ],
          );
        }
      }
    }

    await client.query("COMMIT;");
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  } finally {
    await client.end();
  }
}

const CourseModel = {
  create,
  findById,
  findBySlug,
  findAll,
  findEnrolledByUser,
  getTree,
  syncTreeToDatabase,
};

export default CourseModel;
