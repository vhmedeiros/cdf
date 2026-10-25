import crypto from "node:crypto";
import database from "@/infra/database";

export type PasswordReset = {
  id: string;
  token: string;
  user_id: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

// Duração do token de redefinição: 2 horas
const RESET_EXPIRY_MS = 2 * 60 * 60 * 1000;

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

async function create(userId: string): Promise<PasswordReset> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_MS);

  const result = await database.query<PasswordReset>(
    `INSERT INTO password_resets (token, user_id, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, token, user_id, expires_at, used_at, created_at, updated_at`,
    [token, userId, expiresAt],
  );

  return result.rows[0];
}

async function findByToken(token: string): Promise<PasswordReset | null> {
  const result = await database.query<PasswordReset>(
    `SELECT id, token, user_id, expires_at, used_at, created_at, updated_at
     FROM password_resets
     WHERE token = $1
     LIMIT 1`,
    [token],
  );

  return result.rows[0] ?? null;
}

async function markAsUsed(token: string): Promise<void> {
  await database.query(
    `UPDATE password_resets SET used_at = now(), updated_at = now() WHERE token = $1`,
    [token],
  );
}

const PasswordReset = {
  create,
  findByToken,
  markAsUsed,
};

export default PasswordReset;
