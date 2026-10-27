import database from "@/infra/database";
import { NotFoundError } from "@/infra/errors";
import ReviewModel from "@/models/review";
import { z } from "zod";

export const updateProgressSchema = z.object({
  position_seconds: z.number().min(0),
  watched_delta: z.number().min(0).optional().default(0),
  completed: z.boolean().optional(),
});

export const batchProgressSchema = z.object({
  items: z.array(
    z.object({
      material_id: z.string().uuid(),
      position_seconds: z.number().min(0),
      watched_delta: z.number().min(0).optional().default(0),
      completed: z.boolean().optional(),
    }),
  ),
});

export type Progress = {
  id: string;
  user_id: string;
  material_id: string;
  course_id: string;
  position_seconds: number;
  watched_seconds: number;
  is_completed: boolean;
  completed_at: Date | null;
  last_interaction_at: Date;
  created_at: Date;
  updated_at: Date;
};

export type CourseProgressSummary = {
  total_materials: number;
  completed_materials: number;
  percent: number;
  last_material_id: string | null;
  last_position_seconds: number;
};

const DEFAULT_COMPLETE_RATIO = parseFloat(process.env.PROGRESS_COMPLETE_RATIO || "0.9");

async function upsert(
  userId: string,
  materialId: string,
  data: {
    positionSeconds: number;
    watchedDelta?: number;
    completed?: boolean;
  },
): Promise<Progress> {
  // 1. Busca material para obter course_id e duration_seconds
  const materialRes = await database.query<{
    id: string;
    course_id: string;
    duration_seconds: number;
  }>(
    `SELECT m.id, mod.course_id, m.duration_seconds
     FROM materials m
     INNER JOIN lessons l ON l.id = m.lesson_id
     INNER JOIN modules mod ON mod.id = l.module_id
     WHERE m.id = $1
     LIMIT 1`,
    [materialId],
  );

  const material = materialRes.rows[0];
  if (!material) {
    throw new NotFoundError({ message: "Material não encontrado." });
  }

  const { positionSeconds, watchedDelta = 0, completed } = data;

  // 2. Calcula se deve marcar como concluído
  let shouldComplete = completed === true;
  if (
    !shouldComplete &&
    material.duration_seconds > 0 &&
    positionSeconds / material.duration_seconds >= DEFAULT_COMPLETE_RATIO
  ) {
    shouldComplete = true;
  }

  const result = await database.query<Progress>(
    `INSERT INTO progress (
       user_id,
       material_id,
       course_id,
       position_seconds,
       watched_seconds,
       is_completed,
       completed_at,
       last_interaction_at,
       updated_at
     )
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       CASE WHEN $6 = true THEN now() ELSE NULL END,
       now(),
       now()
     )
     ON CONFLICT (user_id, material_id) DO UPDATE SET
       position_seconds = EXCLUDED.position_seconds,
       watched_seconds = progress.watched_seconds + EXCLUDED.watched_seconds,
       is_completed = CASE 
         WHEN EXCLUDED.is_completed = true THEN true
         WHEN $7 = false THEN false -- se explicitamente desmarcado
         ELSE progress.is_completed
       END,
       completed_at = CASE
         WHEN EXCLUDED.is_completed = true AND progress.completed_at IS NULL THEN now()
         WHEN $7 = false THEN NULL
         ELSE progress.completed_at
       END,
       last_interaction_at = now(),
       updated_at = now()
     RETURNING *`,
    [
      userId,
      materialId,
      material.course_id,
      positionSeconds,
      watchedDelta,
      shouldComplete,
      completed, // $7
    ],
  );

  const row = result.rows[0];

  // 3. Registra atividade diária (study_days) e agenda revisões se aula concluída
  try {
    const isNowCompleted = row.is_completed === true;
    const addedCompleted = isNowCompleted && completed !== false ? 1 : 0;

    if (watchedDelta > 0 || addedCompleted > 0) {
      await database.query(
        `INSERT INTO study_days (user_id, date, seconds, materials_completed, updated_at)
         VALUES ($1, CURRENT_DATE, $2, $3, now())
         ON CONFLICT (user_id, date) DO UPDATE SET
           seconds = study_days.seconds + EXCLUDED.seconds,
           materials_completed = CASE 
             WHEN EXCLUDED.materials_completed > 0 THEN study_days.materials_completed + EXCLUDED.materials_completed 
             ELSE study_days.materials_completed 
           END,
           updated_at = now()`,
        [userId, Math.round(watchedDelta), addedCompleted],
      );
    }

    if (isNowCompleted) {
      await ReviewModel.scheduleReviews(userId, materialId, material.course_id);
    }
  } catch (err) {
    console.error("Erro ao registrar atividade ou agendar revisões:", err);
  }

  return {
    ...row,
    position_seconds: parseFloat(row.position_seconds as any),
    watched_seconds: parseFloat(row.watched_seconds as any),
  };
}

async function findByUserAndMaterial(userId: string, materialId: string): Promise<Progress | null> {
  const result = await database.query<Progress>(
    `SELECT * FROM progress WHERE user_id = $1 AND material_id = $2 LIMIT 1`,
    [userId, materialId],
  );

  if (!result.rows[0]) return null;

  const row = result.rows[0];
  return {
    ...row,
    position_seconds: parseFloat(row.position_seconds as any),
    watched_seconds: parseFloat(row.watched_seconds as any),
  };
}

async function listByUserAndCourse(userId: string, courseId: string): Promise<Progress[]> {
  const result = await database.query<Progress>(
    `SELECT * FROM progress WHERE user_id = $1 AND course_id = $2`,
    [userId, courseId],
  );

  return result.rows.map((row) => ({
    ...row,
    position_seconds: parseFloat(row.position_seconds as any),
    watched_seconds: parseFloat(row.watched_seconds as any),
  }));
}

async function toggleCompleted(userId: string, materialId: string): Promise<Progress> {
  const existing = await findByUserAndMaterial(userId, materialId);
  const nextCompleted = !existing?.is_completed;

  return upsert(userId, materialId, {
    positionSeconds: existing ? existing.position_seconds : 0,
    completed: nextCompleted,
  });
}

async function getCourseSummary(userId: string, courseId: string): Promise<CourseProgressSummary> {
  const statsRes = await database.query<{
    total_materials: string;
    completed_materials: string;
    last_material_id: string | null;
    last_position_seconds: string | null;
  }>(
    `WITH course_mats AS (
       SELECT m.id
       FROM materials m
       INNER JOIN lessons l ON l.id = m.lesson_id
       INNER JOIN modules mod ON mod.id = l.module_id
       WHERE mod.course_id = $1 AND m.is_active = true
     ),
     user_prog AS (
       SELECT p.material_id, p.is_completed, p.position_seconds, p.last_interaction_at
       FROM progress p
       WHERE p.user_id = $2 AND p.course_id = $1
     )
     SELECT
       (SELECT count(*) FROM course_mats) as total_materials,
       (SELECT count(*) FROM user_prog WHERE is_completed = true) as completed_materials,
       (SELECT material_id FROM user_prog ORDER BY last_interaction_at DESC LIMIT 1) as last_material_id,
       (SELECT position_seconds FROM user_prog ORDER BY last_interaction_at DESC LIMIT 1) as last_position_seconds`,
    [courseId, userId],
  );

  const row = statsRes.rows[0];
  const total = parseInt(row?.total_materials || "0", 10);
  const completed = parseInt(row?.completed_materials || "0", 10);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total_materials: total,
    completed_materials: completed,
    percent,
    last_material_id: row?.last_material_id || null,
    last_position_seconds: parseFloat(row?.last_position_seconds || "0"),
  };
}

const ProgressModel = {
  upsert,
  findByUserAndMaterial,
  listByUserAndCourse,
  toggleCompleted,
  getCourseSummary,
};

export default ProgressModel;
