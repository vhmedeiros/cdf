import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Tabela progress (acompanhamento de posição e conclusão de aulas/materiais)
  pgm.createTable("progress", {
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
    position_seconds: {
      type: "numeric(10,2)",
      notNull: true,
      default: 0,
    },
    watched_seconds: {
      type: "numeric(10,2)",
      notNull: true,
      default: 0,
    },
    is_completed: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    completed_at: {
      type: "timestamptz",
    },
    last_interaction_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
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

  pgm.addConstraint("progress", "progress_user_material_unique", {
    unique: ["user_id", "material_id"],
  });

  pgm.createIndex("progress", ["user_id", "course_id"]);
  pgm.createIndex("progress", ["user_id", "is_completed"]);

  // 2. Tabela notes (anotações por material com timestamp)
  pgm.createTable("notes", {
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
    timestamp_seconds: {
      type: "numeric(10,2)",
    },
    body: {
      type: "text",
      notNull: true,
    },
    is_important: {
      type: "boolean",
      notNull: true,
      default: false,
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

  pgm.createIndex("notes", ["user_id", "material_id"]);
  pgm.createIndex("notes", ["user_id", "course_id"]);
  pgm.createIndex("notes", ["user_id", "is_important"]);

  // 3. Tabela user_preferences (Pomodoro, preferências de player e interface)
  pgm.createTable("user_preferences", {
    user_id: {
      type: "uuid",
      primaryKey: true,
      references: "users",
      onDelete: "CASCADE",
    },
    pomodoro_focus_minutes: {
      type: "integer",
      notNull: true,
      default: 25,
    },
    pomodoro_short_break_minutes: {
      type: "integer",
      notNull: true,
      default: 5,
    },
    pomodoro_long_break_minutes: {
      type: "integer",
      notNull: true,
      default: 15,
    },
    pomodoro_sound_enabled: {
      type: "boolean",
      notNull: true,
      default: true,
    },
    playback_rate: {
      type: "numeric(3,1)",
      notNull: true,
      default: 1.0,
    },
    volume: {
      type: "numeric(3,2)",
      notNull: true,
      default: 1.0,
    },
    autoplay_next: {
      type: "boolean",
      notNull: true,
      default: true,
    },
    theater_mode: {
      type: "boolean",
      notNull: true,
      default: false,
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
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("user_preferences");
  pgm.dropTable("notes");
  pgm.dropTable("progress");
}
