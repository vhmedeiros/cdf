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
 *
 * Idempotente: rodar o sync N vezes sobre a mesma pasta deixa o banco igual.
 * - Módulo é reconhecido por (course_id, drive_folder_id).
 * - Aula é reconhecida por drive_folder_id (estratégia 'folders') ou, quando não tem pasta
 *   própria (estratégia 'files', "Introdução", "Materiais do módulo"), por raw_name no módulo.
 * - Material é reconhecido por drive_file_id (único).
 * - Tudo que não apareceu nesta leitura recebe soft delete (is_active = false). Nada é
 *   apagado, então progresso e notas (que apontam para materials) são preservados, e um
 *   arquivo que reaparece no Drive é reativado.
 */
async function syncTreeToDatabase(courseId: string, tree: ParsedTree): Promise<void> {
  // Proteção: uma leitura vazia (ex.: credencial do Drive ausente, pasta sem permissão)
  // desativaria o curso inteiro. Melhor falhar e manter o conteúdo atual.
  if (tree.materialsCount === 0) {
    throw new Error(
      "A leitura da pasta do Drive não retornou nenhum material. Sincronização cancelada para não desativar o conteúdo atual.",
    );
  }

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
      [tree.totalDurationSeconds || 0, tree.materialsCount || 0, courseId],
    );

    const seenModuleIds: string[] = [];
    const seenLessonIds: string[] = [];
    const seenDriveFileIds: string[] = [];

    // 2. Upsert de módulos, aulas e materiais
    for (const mod of tree.modules) {
      // Se houver duplicatas antigas, reaproveita a mais antiga (ignora as já usadas neste sync)
      const existingMod = await client.query<{ id: string }>(
        `SELECT id FROM modules
         WHERE course_id = $1 AND drive_folder_id = $2 AND NOT (id = ANY($3::uuid[]))
         ORDER BY created_at ASC
         LIMIT 1`,
        [courseId, mod.driveFolderId ?? null, seenModuleIds],
      );

      let moduleId = existingMod.rows[0]?.id;
      if (moduleId) {
        await client.query(
          `UPDATE modules
           SET raw_name = $1, title = $2, position = $3, is_active = true, updated_at = now()
           WHERE id = $4`,
          [mod.rawName, mod.title, mod.position, moduleId],
        );
      } else {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO modules (course_id, drive_folder_id, raw_name, title, position, is_active)
           VALUES ($1, $2, $3, $4, $5, true)
           RETURNING id`,
          [courseId, mod.driveFolderId ?? null, mod.rawName, mod.title, mod.position],
        );
        moduleId = inserted.rows[0].id;
      }
      seenModuleIds.push(moduleId);

      for (const les of mod.lessons) {
        const driveFolderId = les.driveFolderId ?? null;
        const existingLes = await client.query<{ id: string }>(
          driveFolderId
            ? `SELECT id FROM lessons
               WHERE module_id = $1 AND drive_folder_id = $2 AND NOT (id = ANY($3::uuid[]))
               ORDER BY created_at ASC
               LIMIT 1`
            : `SELECT id FROM lessons
               WHERE module_id = $1 AND drive_folder_id IS NULL AND raw_name = $2
                 AND NOT (id = ANY($3::uuid[]))
               ORDER BY created_at ASC
               LIMIT 1`,
          [moduleId, driveFolderId ?? les.rawName, seenLessonIds],
        );

        let lessonId = existingLes.rows[0]?.id;
        if (lessonId) {
          await client.query(
            `UPDATE lessons
             SET raw_name = $1, title = $2, position = $3, duration_seconds = $4,
                 is_active = true, updated_at = now()
             WHERE id = $5`,
            [les.rawName, les.title, les.position, les.durationSeconds, lessonId],
          );
        } else {
          const inserted = await client.query<{ id: string }>(
            `INSERT INTO lessons (module_id, drive_folder_id, raw_name, title, position, duration_seconds, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING id`,
            [moduleId, driveFolderId, les.rawName, les.title, les.position, les.durationSeconds],
          );
          lessonId = inserted.rows[0].id;
        }
        seenLessonIds.push(lessonId);

        for (const mat of les.materials) {
          await client.query(
            `INSERT INTO materials (
              lesson_id, drive_file_id, raw_name, title, kind, mime, size_bytes, duration_seconds, md5, drive_modified_time, position, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
            ON CONFLICT (drive_file_id) DO UPDATE SET
              lesson_id = EXCLUDED.lesson_id,
              raw_name = EXCLUDED.raw_name,
              title = EXCLUDED.title,
              kind = EXCLUDED.kind,
              mime = EXCLUDED.mime,
              size_bytes = EXCLUDED.size_bytes,
              position = EXCLUDED.position,
              duration_seconds = EXCLUDED.duration_seconds,
              md5 = EXCLUDED.md5,
              drive_modified_time = EXCLUDED.drive_modified_time,
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
          seenDriveFileIds.push(mat.driveFileId);
        }
      }
    }

    // 3. Soft delete do que sumiu do Drive (ou de duplicatas criadas por syncs antigos)
    await client.query(
      `UPDATE materials m
       SET is_active = false, updated_at = now()
       FROM lessons l
       JOIN modules mo ON mo.id = l.module_id
       WHERE m.lesson_id = l.id
         AND mo.course_id = $1
         AND m.is_active = true
         AND NOT (m.drive_file_id = ANY($2::text[]))`,
      [courseId, seenDriveFileIds],
    );

    await client.query(
      `UPDATE lessons l
       SET is_active = false, updated_at = now()
       FROM modules mo
       WHERE l.module_id = mo.id
         AND mo.course_id = $1
         AND l.is_active = true
         AND NOT (l.id = ANY($2::uuid[]))`,
      [courseId, seenLessonIds],
    );

    await client.query(
      `UPDATE modules
       SET is_active = false, updated_at = now()
       WHERE course_id = $1
         AND is_active = true
         AND NOT (id = ANY($2::uuid[]))`,
      [courseId, seenModuleIds],
    );

    await client.query("COMMIT;");
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  } finally {
    await client.end();
  }
}

async function updateStatus(id: string, status: CourseStatus): Promise<Course | null> {
  const result = await database.query<Course>(
    `UPDATE courses SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, id],
  );
  return result.rows[0] ?? null;
}

async function getEnrollmentsCount(courseId: string): Promise<number> {
  const result = await database.query<{ count: string }>(
    `SELECT count(*)::text as count FROM enrollments WHERE course_id = $1`,
    [courseId],
  );
  return parseInt(result.rows[0]?.count || "0", 10);
}

async function deleteCourse(id: string): Promise<boolean> {
  const result = await database.query(`DELETE FROM courses WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

const CourseModel = {
  create,
  findById,
  findBySlug,
  findAll,
  findEnrolledByUser,
  getTree,
  syncTreeToDatabase,
  updateStatus,
  getEnrollmentsCount,
  deleteCourse,
};

export default CourseModel;
