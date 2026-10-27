import database from "@/infra/database";
import { NotFoundError } from "@/infra/errors";
import { z } from "zod";

export const reviewStageSchema = z.enum(["1d", "7d", "30d"]);
export type ReviewStage = z.infer<typeof reviewStageSchema>;

export type Review = {
  id: string;
  user_id: string;
  material_id: string;
  course_id: string;
  stage: ReviewStage;
  due_date: Date;
  done_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type ReviewWithDetails = Review & {
  material_title: string;
  material_kind: string;
  material_duration_seconds: number;
  lesson_title: string;
  course_title: string;
  course_slug: string;
};

const STAGE_INTERVALS_DAYS: Record<ReviewStage, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
};

/**
 * Agenda automaticamente as 3 fases de revisão espaçada (1d, 7d, 30d) para um material concluído.
 */
async function scheduleReviews(
  userId: string,
  materialId: string,
  courseId: string,
  baseDate: Date = new Date(),
): Promise<Review[]> {
  const stages: ReviewStage[] = ["1d", "7d", "30d"];
  const scheduledReviews: Review[] = [];

  for (const stage of stages) {
    const daysToAdd = STAGE_INTERVALS_DAYS[stage];
    const dueDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    const res = await database.query<Review>(
      `INSERT INTO reviews (
         user_id, material_id, course_id, stage, due_date, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, now(), now())
       ON CONFLICT (user_id, material_id, stage) DO NOTHING
       RETURNING *`,
      [userId, materialId, courseId, stage, dueDate],
    );

    if (res.rows[0]) {
      scheduledReviews.push(res.rows[0]);
    }
  }

  return scheduledReviews;
}

/**
 * Lista as revisões pendentes com detalhes de material, aula e curso.
 */
async function listDue(
  userId: string,
  options: {
    dueBefore?: Date;
    includeDone?: boolean;
    limit?: number;
  } = {},
): Promise<ReviewWithDetails[]> {
  const dueBefore = options.dueBefore || new Date();
  const limit = options.limit || 50;

  let query = `
    SELECT 
      r.id,
      r.user_id,
      r.material_id,
      r.course_id,
      r.stage,
      r.due_date,
      r.done_at,
      r.created_at,
      r.updated_at,
      m.title as material_title,
      m.kind as material_kind,
      m.duration_seconds as material_duration_seconds,
      l.title as lesson_title,
      c.title as course_title,
      c.slug as course_slug
    FROM reviews r
    INNER JOIN materials m ON m.id = r.material_id
    INNER JOIN lessons l ON l.id = m.lesson_id
    INNER JOIN courses c ON c.id = r.course_id
    WHERE r.user_id = $1
  `;

  const values: any[] = [userId];

  if (!options.includeDone) {
    query += ` AND r.done_at IS NULL AND r.due_date <= $2`;
    values.push(dueBefore);
  } else {
    query += ` AND r.due_date <= $2`;
    values.push(dueBefore);
  }

  query += ` ORDER BY r.due_date ASC LIMIT $${values.length + 1}`;
  values.push(limit);

  const res = await database.query<ReviewWithDetails>(query, values);
  return res.rows;
}

/**
 * Marca uma revisão como concluída.
 */
async function complete(userId: string, reviewId: string): Promise<ReviewWithDetails> {
  const res = await database.query<ReviewWithDetails>(
    `UPDATE reviews
     SET done_at = now(), updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [reviewId, userId],
  );

  const review = res.rows[0];
  if (!review) {
    throw new NotFoundError({ message: "Revisão não encontrada." });
  }

  return review;
}

/**
 * Obtém a contagem de revisões pendentes hoje para o usuário.
 */
async function countPendingToday(userId: string): Promise<number> {
  const res = await database.query<{ count: string }>(
    `SELECT count(*) as count
     FROM reviews
     WHERE user_id = $1 AND done_at IS NULL AND due_date <= now()`,
    [userId],
  );

  return parseInt(res.rows[0]?.count || "0", 10);
}

const ReviewModel = {
  scheduleReviews,
  listDue,
  complete,
  countPendingToday,
};

export default ReviewModel;
