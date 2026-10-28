import bcrypt from "bcryptjs";
import { z } from "zod";
import database from "@/infra/database";
import { ValidationError, NotFoundError } from "@/infra/errors";

// Tipo público do usuário — nunca exponha o campo "password"
export type User = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  features: string[];
  preferences: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

// Tipo interno que inclui o hash da senha — só usado dentro deste model
type UserWithPassword = User & { password: string };

// Usuário anônimo — representa quem NÃO está logado
// features vazio = sem nenhuma permissão
export const anonymousUser = {
  id: null,
  features: [] as string[],
  isAnonymous: true,
} as const;

export type AnyUser = User | typeof anonymousUser;

// Schema zod para criar usuário (valida a entrada da API)
const CreateUserSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres.")
    .max(72, "Senha deve ter no máximo 72 caracteres."),
  display_name: z
    .string()
    .min(1, "Nome não pode ser vazio.")
    .max(100, "Nome deve ter no máximo 100 caracteres."),
  features: z.array(z.string()).default([]),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

async function create(input: CreateUserInput): Promise<User> {
  const parsed = CreateUserSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError({
      message: parsed.error.issues[0].message,
    });
  }

  const { email, password, display_name, features } = parsed.data;

  // Nunca armazenamos a senha em texto puro.
  // bcrypt.hash(password, 10): o "10" é o "cost factor" — quantas vezes
  // o algoritmo de hashing é executado (2^10 = 1024 iterações).
  // Mais alto = mais seguro, mas mais lento. 10 ≈ 100ms, padrão da indústria.
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await database.query<User>(
    `INSERT INTO users (email, password, display_name, features)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, display_name, avatar_url, features, preferences, created_at, updated_at`,
    [email, hashedPassword, display_name, features],
  );

  return result.rows[0];
}

async function findByEmail(email: string): Promise<UserWithPassword | null> {
  const result = await database.query<UserWithPassword>(
    `SELECT id, email, password, display_name, avatar_url, features, preferences, created_at, updated_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email],
  );
  return result.rows[0] ?? null;
}

async function findById(id: string): Promise<User | null> {
  const result = await database.query<User>(
    `SELECT id, email, display_name, avatar_url, features, preferences, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

async function updatePassword(id: string, newPassword: string): Promise<void> {
  const hashed = await bcrypt.hash(newPassword, 10);
  await database.query(`UPDATE users SET password = $1, updated_at = now() WHERE id = $2`, [
    hashed,
    id,
  ]);
}

// Valida email + senha. Retorna o usuário público (sem senha) ou lança erro.
async function authenticate(email: string, password: string): Promise<User> {
  const user = await findByEmail(email);

  // Usamos a mesma mensagem de erro para email inválido E senha errada —
  // isso evita que alguém descubra quais emails estão cadastrados.
  if (!user) {
    // Mesmo sem usuário, rodamos o bcrypt para gastar o mesmo tempo
    // (evita timing attack: descobrir se o email existe pela velocidade da resposta)
    await bcrypt.hash(password, 10);
    throw new NotFoundError({
      message: "E-mail ou senha incorretos.",
      action: "Verifique suas credenciais e tente novamente.",
      statusCode: 401,
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new NotFoundError({
      message: "E-mail ou senha incorretos.",
      action: "Verifique suas credenciais e tente novamente.",
      statusCode: 401,
    });
  }

  // Retorna o usuário SEM o campo password
  const { password: _password, ...publicUser } = user;
  return publicUser;
}

async function deleteUser(id: string): Promise<boolean> {
  const result = await database.query(`DELETE FROM users WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

const User = { create, findByEmail, findById, updatePassword, authenticate, deleteUser };
export default User;
