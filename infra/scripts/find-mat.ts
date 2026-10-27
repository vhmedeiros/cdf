import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
dotenvExpand.expand(dotenv.config({ path: ".env.development" }));

import database from "@/infra/database";

async function main() {
  const res = await database.query(
    `SELECT m.id, m.title, m.drive_file_id, m.size_bytes, l.title as lesson_title, mod.title as module_title
     FROM materials m
     INNER JOIN lessons l ON l.id = m.lesson_id
     INNER JOIN modules mod ON mod.id = l.module_id
     WHERE m.id = 'ecb59245-88e6-44c2-a309-b939ef00251e'`,
  );
  console.log("Material info:", res.rows[0]);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
