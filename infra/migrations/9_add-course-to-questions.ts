import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Vincula questões diretamente a um curso (opcional: se null, é questão de concurso geral)
  pgm.addColumn("questions", {
    course_id: {
      type: "uuid",
      references: "courses",
      onDelete: "CASCADE",
    },
  });
  pgm.createIndex("questions", ["course_id"]);

  // 2. Permite que disciplinas pertençam a um curso específico (se null, é disciplina transversal)
  pgm.addColumn("subjects", {
    course_id: {
      type: "uuid",
      references: "courses",
      onDelete: "CASCADE",
    },
  });
  pgm.createIndex("subjects", ["course_id"]);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("subjects", "course_id");
  pgm.dropColumn("questions", "course_id");
}
