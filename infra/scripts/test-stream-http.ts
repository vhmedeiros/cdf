import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
dotenvExpand.expand(dotenv.config({ path: ".env.development" }));

import database from "@/infra/database";

async function main() {
  // 1. Login
  const loginRes = await fetch("http://localhost:3000/api/v1/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@aula.local", password: "admin123456" }),
  });

  const cookie = loginRes.headers.get("set-cookie");
  console.log("Login status:", loginRes.status, "Cookie:", cookie?.split(";")[0]);

  // 2. Query the material ID for '1nkM7s9gvd-VMXlBfEGX6iyYUr5qS1BBv'
  const mat = await database.query(
    "SELECT id, title, drive_file_id FROM materials WHERE drive_file_id = '1nkM7s9gvd-VMXlBfEGX6iyYUr5qS1BBv'",
  );
  const materialId = mat.rows[0].id;
  console.log("Testing Material:", mat.rows[0].title, "(ID:", materialId, ")");

  // 3. Test HTTP Range request
  const t0 = Date.now();
  const streamRes = await fetch(`http://localhost:3000/api/v1/stream/${materialId}`, {
    headers: {
      Cookie: cookie || "",
      Range: "bytes=0-1048575", // 1MB chunk
    },
  });
  const t1 = Date.now();

  console.log(`Stream response: ${streamRes.status} in ${t1 - t0}ms`);
  console.log("Headers:", {
    "content-type": streamRes.headers.get("content-type"),
    "content-range": streamRes.headers.get("content-range"),
    "content-length": streamRes.headers.get("content-length"),
    "accept-ranges": streamRes.headers.get("accept-ranges"),
  });

  const arrayBuf = await streamRes.arrayBuffer();
  console.log("Bytes received:", arrayBuf.byteLength);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
