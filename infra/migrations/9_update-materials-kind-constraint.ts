import type { MigrationBuilder } from "node-pg-migrate";

/**
 * Atualiza o check constraint de `materials.kind` para incluir os novos tipos
 * de material renderizável diretamente na plataforma: markdown, html, text.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_kind_check;
    ALTER TABLE materials ADD CONSTRAINT materials_kind_check
      CHECK (kind = ANY (ARRAY['video','audio','pdf','doc','image','link','other','markdown','html','text']::text[]));
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_kind_check;
    ALTER TABLE materials ADD CONSTRAINT materials_kind_check
      CHECK (kind = ANY (ARRAY['video','audio','pdf','doc','image','link','other']::text[]));
  `);
}
