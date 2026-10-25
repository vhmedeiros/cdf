import database from "@/infra/database";

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  granted_by: string | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type CreateEnrollmentInput = {
  userId: string;
  courseId: string;
  grantedBy?: string | null;
  expiresAt?: Date | null;
};

async function create(input: CreateEnrollmentInput): Promise<Enrollment> {
  const { userId, courseId, grantedBy = null, expiresAt = null } = input;

  const result = await database.query<Enrollment>(
    `INSERT INTO enrollments (user_id, course_id, granted_by, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, course_id) DO UPDATE SET
       expires_at = EXCLUDED.expires_at,
       updated_at = now()
     RETURNING *`,
    [userId, courseId, grantedBy, expiresAt],
  );

  return result.rows[0];
}

async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
  const result = await database.query<{ exists: boolean }>(
    `SELECT true as exists
     FROM enrollments
     WHERE user_id = $1
       AND course_id = $2
       AND (expires_at IS NULL OR expires_at > now())
     LIMIT 1`,
    [userId, courseId],
  );

  return Boolean(result.rows[0]?.exists);
}

async function remove(userId: string, courseId: string): Promise<void> {
  await database.query(`DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2`, [
    userId,
    courseId,
  ]);
}

const EnrollmentModel = {
  create,
  isEnrolled,
  remove,
};

export default EnrollmentModel;
