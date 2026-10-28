import database from "@/infra/database";
import { NotFoundError, ValidationError } from "@/infra/errors";

export interface DailyGoal {
  id: string;
  user_id: string;
  subject_id: string;
  target: number;
  active_weekdays: number[];
  created_at: Date;
  updated_at: Date;
  subject_name?: string;
  subject_color?: string;
  answered_today?: number;
  completed_today?: boolean;
}

export interface UpsertDailyGoalInput {
  user_id: string;
  subject_id: string;
  target?: number;
  active_weekdays?: number[];
}

async function upsert(input: UpsertDailyGoalInput): Promise<DailyGoal> {
  const { user_id, subject_id, target = 20, active_weekdays = [1, 2, 3, 4, 5, 6, 7] } = input;

  if (!user_id) throw new ValidationError({ message: "ID do usuário é obrigatório." });
  if (!subject_id) throw new ValidationError({ message: "ID da disciplina é obrigatório." });
  if (target < 1) throw new ValidationError({ message: "A meta deve ser de pelo menos 1 questão." });

  const query = {
    text: `
      INSERT INTO daily_goals (user_id, subject_id, target, active_weekdays, updated_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (user_id, subject_id)
      DO UPDATE SET
        target = EXCLUDED.target,
        active_weekdays = EXCLUDED.active_weekdays,
        updated_at = now()
      RETURNING *;
    `,
    values: [user_id, subject_id, target, active_weekdays],
  };

  const result = await database.query(query);
  return result.rows[0];
}

async function listForUserWithProgress(userId: string): Promise<DailyGoal[]> {
  const query = {
    text: `
      SELECT 
        dg.*,
        s.name as subject_name,
        s.color as subject_color,
        COALESCE(
          (
            SELECT COUNT(DISTINCT a.id)
            FROM answers a
            JOIN question_topics qt ON qt.question_id = a.question_id
            JOIN topics t ON qt.topic_id = t.id
            WHERE a.user_id = $1 
              AND t.subject_id = dg.subject_id
              AND a.created_at >= date_trunc('day', now())
          ), 0
        )::integer as answered_today
      FROM daily_goals dg
      JOIN subjects s ON dg.subject_id = s.id
      WHERE dg.user_id = $1
      ORDER BY s.name ASC;
    `,
    values: [userId],
  };

  const result = await database.query(query);
  return result.rows.map((row) => ({
    ...row,
    completed_today: row.answered_today >= row.target,
  }));
}

const DailyGoalModel = {
  upsert,
  listForUserWithProgress,
};

export default DailyGoalModel;
