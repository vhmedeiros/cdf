import crypto from "node:crypto";
import database from "@/infra/database";

export type Invite = {
  id: string;
  email: string;
  token: string;
  features: string[];
  expires_at: Date;
  used_at: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
};

// Duração do convite: 7 dias
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

type CreateInviteInput = {
  email: string;
  features: string[];
  createdBy: string; // user_id do admin que criou
};

async function create({ email, features, createdBy }: CreateInviteInput): Promise<Invite> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

  const result = await database.query<Invite>(
    `INSERT INTO invites (email, token, features, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, token, features, expires_at, used_at, created_by, created_at, updated_at`,
    [email, token, features, expiresAt, createdBy],
  );

  return result.rows[0];
}

async function findByToken(token: string): Promise<Invite | null> {
  const result = await database.query<Invite>(
    `SELECT id, email, token, features, expires_at, used_at, created_by, created_at, updated_at
     FROM invites
     WHERE token = $1
     LIMIT 1`,
    [token],
  );

  return result.rows[0] ?? null;
}

async function markAsUsed(token: string): Promise<void> {
  await database.query(`UPDATE invites SET used_at = now(), updated_at = now() WHERE token = $1`, [
    token,
  ]);
}

const Invite = { create, findByToken, markAsUsed };
export default Invite;
