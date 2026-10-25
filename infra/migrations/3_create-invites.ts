import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("invites", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    // E-mail para quem o convite foi enviado
    email: {
      type: "text",
      notNull: true,
    },
    // Token que vai no link do e-mail (aleatório, único)
    token: {
      type: "text",
      notNull: true,
      unique: true,
    },
    // Quais features o usuário convidado vai ter ao aceitar
    features: {
      type: "text[]",
      notNull: true,
      default: "{}",
    },
    expires_at: {
      type: "timestamptz",
      notNull: true,
    },
    // NULL = convite ainda não foi usado. Preenchido ao aceitar.
    used_at: {
      type: "timestamptz",
    },
    // Quem criou o convite (deve ter feature 'create:invite')
    created_by: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
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

  pgm.createIndex("invites", "token");
  pgm.createIndex("invites", "email");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("invites");
}
