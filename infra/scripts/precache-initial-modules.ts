import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
dotenvExpand.expand(dotenv.config({ path: ".env.development" }));

import database from "@/infra/database";
import { ensureMediaCached, isMediaCached } from "@/services/drive/mediaCache";

async function main() {
  const videos = await database.query(
    `SELECT m.id, m.title, m.drive_file_id, m.mime, l.title as lesson_title, mod.title as module_title
     FROM materials m
     INNER JOIN lessons l ON l.id = m.lesson_id
     INNER JOIN modules mod ON mod.id = l.module_id
     WHERE m.kind = 'video' AND mod.title IN ('Dia 1', 'Dia 2', 'Dia 3')
     ORDER BY mod.position ASC, l.position ASC`,
  );

  console.log(`Encontrados ${videos.rows.length} vídeos nos módulos Dia 1, Dia 2 e Dia 3.`);

  for (const v of videos.rows) {
    if (isMediaCached(v.drive_file_id, v.mime)) {
      console.log(`⚡ Já em cache: [${v.module_title}] ${v.lesson_title}`);
    } else {
      console.log(`⏳ Baixando para cache: [${v.module_title}] ${v.lesson_title}...`);
      const t0 = Date.now();
      await ensureMediaCached(v.drive_file_id, v.mime);
      console.log(`✅ Concluído em ${Date.now() - t0}ms`);
    }
  }

  console.log("Todos os vídeos dos 3 primeiros módulos estão prontos no cache local!");
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
