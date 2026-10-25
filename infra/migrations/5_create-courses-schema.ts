import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Tabela courses
  pgm.createTable("courses", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    title: { type: "text", notNull: true },
    slug: { type: "text", notNull: true, unique: true },
    description: { type: "text" },
    drive_url: { type: "text", notNull: true },
    drive_folder_id: { type: "text", notNull: true },
    cover_url: { type: "text" },
    accent_color: { type: "text" },
    status: {
      type: "text",
      notNull: true,
      default: "draft",
      check: "status IN ('draft', 'published', 'archived')",
    },
    lesson_strategy: {
      type: "text",
      notNull: true,
      default: "auto",
      check: "lesson_strategy IN ('auto', 'folders', 'files')",
    },
    sync_status: {
      type: "text",
      notNull: true,
      default: "idle",
      check: "sync_status IN ('idle', 'queued', 'running', 'ok', 'error')",
    },
    sync_error: { type: "text" },
    last_synced_at: { type: "timestamptz" },
    drive_changes_token: { type: "text" },
    total_duration_seconds: { type: "integer", notNull: true, default: 0 },
    materials_count: { type: "integer", notNull: true, default: 0 },
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

  pgm.createIndex("courses", "slug");
  pgm.createIndex("courses", "drive_folder_id");

  // 2. Tabela modules
  pgm.createTable("modules", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    course_id: {
      type: "uuid",
      notNull: true,
      references: '"courses"',
      onDelete: "CASCADE",
    },
    drive_folder_id: { type: "text" },
    raw_name: { type: "text", notNull: true },
    title: { type: "text", notNull: true },
    position: { type: "integer", notNull: true },
    is_active: { type: "boolean", notNull: true, default: true },
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

  pgm.createIndex("modules", ["course_id", "position"]);
  pgm.createIndex("modules", "drive_folder_id");

  // 3. Tabela lessons
  pgm.createTable("lessons", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    module_id: {
      type: "uuid",
      notNull: true,
      references: '"modules"',
      onDelete: "CASCADE",
    },
    drive_folder_id: { type: "text" },
    raw_name: { type: "text", notNull: true },
    title: { type: "text", notNull: true },
    position: { type: "integer", notNull: true },
    is_active: { type: "boolean", notNull: true, default: true },
    duration_seconds: { type: "integer", notNull: true, default: 0 },
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

  pgm.createIndex("lessons", ["module_id", "position"]);
  pgm.createIndex("lessons", "drive_folder_id");

  // 4. Tabela materials
  pgm.createTable("materials", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    lesson_id: {
      type: "uuid",
      notNull: true,
      references: '"lessons"',
      onDelete: "CASCADE",
    },
    drive_file_id: { type: "text", notNull: true, unique: true },
    raw_name: { type: "text", notNull: true },
    title: { type: "text", notNull: true },
    kind: {
      type: "text",
      notNull: true,
      check: "kind IN ('video', 'audio', 'pdf', 'doc', 'image', 'link', 'other')",
    },
    mime: { type: "text", notNull: true },
    size_bytes: { type: "bigint", notNull: true, default: 0 },
    duration_seconds: { type: "integer", notNull: true, default: 0 },
    md5: { type: "text" },
    drive_modified_time: { type: "timestamptz" },
    position: { type: "integer", notNull: true },
    is_active: { type: "boolean", notNull: true, default: true },
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

  pgm.createIndex("materials", ["lesson_id", "position"]);
  pgm.createIndex("materials", "drive_file_id");

  // 5. Tabela enrollments
  pgm.createTable("enrollments", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    course_id: {
      type: "uuid",
      notNull: true,
      references: '"courses"',
      onDelete: "CASCADE",
    },
    granted_by: {
      type: "uuid",
      references: '"users"',
      onDelete: "SET NULL",
    },
    expires_at: { type: "timestamptz" }, // NULL = sem expiração
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

  pgm.addConstraint("enrollments", "unique_user_course_enrollment", {
    unique: ["user_id", "course_id"],
  });

  // 6. Tabela sync_runs
  pgm.createTable("sync_runs", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    course_id: {
      type: "uuid",
      notNull: true,
      references: '"courses"',
      onDelete: "CASCADE",
    },
    started_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    finished_at: { type: "timestamptz" },
    status: { type: "text", notNull: true, default: "running" },
    stats: { type: "jsonb", notNull: true, default: "{}" },
    log: { type: "text" },
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

  pgm.createIndex("sync_runs", "course_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("sync_runs");
  pgm.dropTable("enrollments");
  pgm.dropTable("materials");
  pgm.dropTable("lessons");
  pgm.dropTable("modules");
  pgm.dropTable("courses");
}
