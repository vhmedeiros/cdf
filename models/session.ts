import crypto from "node:crypto";
import database from "@/infra/database";

export type Session = {
  id: string;
  token: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
};

// Duração da sessão: 30 dias (em milissegundos)
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// Gera um token criptograficamente seguro.
// crypto.randomBytes(96) → 96 bytes aleatórios → 192 caracteres hex
// É o mesmo módulo `secrets` do Python, mas a API nativa do Node.
function generateToken(): string {
  return crypto.randomBytes(96).toString("hex");
}

async function create(userId: string): Promise<Session> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  const result = await database.query<Session>(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, token, user_id, expires_at, created_at, updated_at`,
    [token, userId, expiresAt],
  );

  return result.rows[0];
}

async function findByToken(token: string): Promise<Session | null> {
  const result = await database.query<Session>(
    `SELECT id, token, user_id, expires_at, created_at, updated_at
     FROM sessions
     WHERE token = $1
       AND expires_at > now()
     LIMIT 1`,
    [token],
  );

  return result.rows[0] ?? null;
}

// Renova a expiração a cada uso (sliding session)
async function renewByToken(token: string): Promise<void> {
  const newExpiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
  await database.query(`UPDATE sessions SET expires_at = $1, updated_at = now() WHERE token = $2`, [
    newExpiresAt,
    token,
  ]);
}

async function deleteByToken(token: string): Promise<void> {
  await database.query(`DELETE FROM sessions WHERE token = $1`, [token]);
}

const Session = { create, findByToken, renewByToken, deleteByToken };
export default Session;
