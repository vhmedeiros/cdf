import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Extensão unaccent para busca full-text insensível a acentos
  pgm.sql("CREATE EXTENSION IF NOT EXISTS unaccent;");

  // 2. Tabela study_days (registro diário de estudo para streak e heatmap)
  pgm.createTable("study_days", {
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "CASCADE",
    },
    date: {
      type: "date",
      notNull: true,
    },
    seconds: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    materials_completed: {
      type: "integer",
      notNull: true,
      default: 0,
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

  pgm.addConstraint("study_days", "study_days_user_date_pk", {
    primaryKey: ["user_id", "date"],
  });

  pgm.createIndex("study_days", ["user_id", { name: "date", sort: "DESC" }]);

  // 3. Tabela reviews (Revisão Espaçada: 1d, 7d, 30d)
  pgm.createTable("reviews", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "CASCADE",
    },
    material_id: {
      type: "uuid",
      notNull: true,
      references: "materials",
      onDelete: "CASCADE",
    },
    course_id: {
      type: "uuid",
      notNull: true,
      references: "courses",
      onDelete: "CASCADE",
    },
    stage: {
      type: "varchar(10)",
      notNull: true,
      check: "stage IN ('1d', '7d', '30d')",
    },
    due_date: {
      type: "timestamptz",
      notNull: true,
    },
    done_at: {
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

  pgm.addConstraint("reviews", "reviews_user_material_stage_unique", {
    unique: ["user_id", "material_id", "stage"],
  });

  pgm.createIndex("reviews", ["user_id", "due_date", "done_at"]);
  pgm.createIndex("reviews", ["user_id", "material_id"]);
  pgm.createIndex("reviews", ["course_id"]);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("reviews");
  pgm.dropTable("study_days");
}
