import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("sessions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    // O token que vai para o cookie do navegador
    // É uma string aleatória (96 bytes em hex = 192 caracteres)
    token: {
      type: "text",
      notNull: true,
      unique: true,
    },
    // Chave estrangeira para a tabela users
    // ON DELETE CASCADE: se o usuário for deletado, a sessão também é deletada
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    expires_at: {
      type: "timestamptz",
      notNull: true,
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

  // Índice no token — buscamos a sessão pelo token a cada requisição autenticada
  pgm.createIndex("sessions", "token");
  // Índice no user_id — útil para deletar todas as sessões de um usuário
  pgm.createIndex("sessions", "user_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("sessions");
}
