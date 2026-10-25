import database from "@/infra/database";
import CourseModel from "@/models/course";
import { buildTree } from "@/services/drive/buildTree";
import { fetchDriveFolderItems } from "@/services/drive/client";

export type SyncCourseJobData = {
  courseId: string;
  dryRun?: boolean;
};

export async function processSyncCourse(data: SyncCourseJobData) {
  const { courseId, dryRun = false } = data;

  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new Error(`Curso com ID ${courseId} não encontrado.`);
  }

  // 1. Registra o início em sync_runs e marca o curso como running
  const runResult = await database.query(
    `INSERT INTO sync_runs (course_id, started_at, status)
     VALUES ($1, now(), 'running')
     RETURNING id`,
    [courseId],
  );
  const syncRunId = runResult.rows[0]?.id;

  await database.query(
    `UPDATE courses SET sync_status = 'running', sync_error = null WHERE id = $1`,
    [courseId],
  );

  try {
    // 2. Busca arquivos do Drive
    const items = await fetchDriveFolderItems(course.drive_folder_id);

    // 3. Constrói a árvore usando a função pura
    const tree = buildTree(items, {
      rootFolderId: course.drive_folder_id,
      strategy: course.lesson_strategy,
    });

    // 4. Se não for dryRun, salva no banco
    if (!dryRun) {
      await CourseModel.syncTreeToDatabase(courseId, tree);
    }

    // 5. Finaliza sync_run com sucesso
    await database.query(
      `UPDATE sync_runs
       SET finished_at = now(),
           status = 'ok',
           stats = $1
       WHERE id = $2`,
      [
        JSON.stringify({
          modulesCount: tree.modules.length,
          materialsCount: tree.materialsCount,
          totalDurationSeconds: tree.totalDurationSeconds,
        }),
        syncRunId,
      ],
    );

    return tree;
  } catch (error: any) {
    console.error(`Erro ao sincronizar curso ${courseId}:`, error);

    await database.query(
      `UPDATE courses SET sync_status = 'error', sync_error = $1 WHERE id = $2`,
      [error.message || "Erro desconhecido", courseId],
    );

    await database.query(
      `UPDATE sync_runs
       SET finished_at = now(),
           status = 'error',
           log = $1
       WHERE id = $2`,
      [error.stack || error.message, syncRunId],
    );

    throw error;
  }
}
