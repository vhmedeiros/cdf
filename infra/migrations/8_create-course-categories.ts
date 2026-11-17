import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("categories", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    slug: { type: "text", notNull: true, unique: true },
    name: { type: "text", notNull: true },
    position: { type: "integer", notNull: true, default: 0 },
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

  pgm.createIndex("categories", "position");

  pgm.addColumn("courses", {
    category_id: {
      type: "uuid",
      references: "categories",
      onDelete: "SET NULL",
    },
  });

  pgm.createIndex("courses", "category_id");

  pgm.sql(`
    INSERT INTO categories (slug, name, position) VALUES
      ('enem', 'ENEM', 1),
      ('concursos', 'Concursos', 2),
      ('programacao', 'Programação', 3),
      ('ingles', 'Inglês', 4),
      ('outros', 'Outros', 5)
    ON CONFLICT (slug) DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("courses", "category_id");
  pgm.dropTable("categories");
}
