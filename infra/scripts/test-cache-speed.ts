import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
dotenvExpand.expand(dotenv.config({ path: ".env.development" }));

import { ensureMediaCached, isMediaCached } from "@/services/drive/mediaCache";

async function main() {
  // Let's test with '1gBt9VvVx6S5BK7SHgb9wyKSQqrBPp-vL' (Git GitHub, Dia 2, 76MB)
  const fileId = "1gBt9VvVx6S5BK7SHgb9wyKSQqrBPp-vL";
  console.log("Is cached before:", isMediaCached(fileId));

  const t0 = Date.now();
  console.log("Starting ensureMediaCached...");
  const cachedPath = await ensureMediaCached(fileId, "video/mp4");
  const t1 = Date.now();
  console.log(`Finished in ${t1 - t0}ms:`, cachedPath);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
