import type { MigrationBuilder } from "node-pg-migrate";

// up() = o que FAZER no banco. Chamado por: npm run migrations:up
export async function up(pgm: MigrationBuilder): Promise<void> {
  // Cria tabela users.
  // pgm.createTable é o equivalente do SQL: CREATE TABLE IF NOT EXISTS ...
  pgm.createTable("users", {
    // UUID como PK — mais seguro que integer auto-incrementado
    // gen_random_uuid() é uma função nativa do PostgreSQL 13+
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    email: {
      type: "text",
      notNull: true,
      unique: true,
    },
    // Nunca guardamos senha em texto puro — só o hash bcrypt
    password: {
      type: "text",
      notNull: true,
    },
    display_name: {
      type: "text",
      notNull: true,
    },
    avatar_url: {
      type: "text",
    },
    // Array de strings — as permissões do usuário
    // ex: '{read:course,create:note}' no Postgres
    features: {
      type: "text[]",
      notNull: true,
      default: "{}",
    },
    // JSONB — JSON binário indexável. Preferências flexíveis do usuário
    preferences: {
      type: "jsonb",
      notNull: true,
      default: "{}",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // Índice no email — aceleramos a busca por email no login
  pgm.createIndex("users", "email");
}

// down() = como DESFAZER. Chamado por: npm run migrations:down
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("users");
}
