import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
dotenvExpand.expand(dotenv.config({ path: ".env.development" }));

import database from "@/infra/database";

async function main() {
  const res = await database.query(
    `SELECT count(*) as total,
            count(*) FILTER (WHERE kind = 'video') as total_videos,
            sum(size_bytes::bigint) FILTER (WHERE kind = 'video') as total_video_bytes
     FROM materials`,
  );
  console.log("Stats:", res.rows[0]);

  const first10Videos = await database.query(
    `SELECT m.id, m.title, m.drive_file_id, m.size_bytes, l.title as lesson_title, mod.title as module_title
     FROM materials m
     INNER JOIN lessons l ON l.id = m.lesson_id
     INNER JOIN modules mod ON mod.id = l.module_id
     WHERE m.kind = 'video'
     ORDER BY mod.position ASC, l.position ASC
     LIMIT 10`,
  );
  console.log("First 10 videos:", first10Videos.rows);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
