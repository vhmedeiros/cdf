import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("password_resets", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    // Token aleatório enviado no link de redefinição
    token: {
      type: "text",
      notNull: true,
      unique: true,
    },
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
    // NULL = não utilizado; quando usado, recebe now()
    used_at: {
      type: "timestamptz",
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

  pgm.createIndex("password_resets", "token");
  pgm.createIndex("password_resets", "user_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("password_resets");
}
