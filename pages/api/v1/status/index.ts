import fs from "node:fs";
import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import database from "@/infra/database";
import { getServiceAccountPath } from "@/services/drive/client";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(_req: NextApiRequest, res: NextApiResponse) {
  const updatedAt = new Date().toISOString();

  const databaseVersionResult = await database.query("SHOW server_version;");
  const databaseVersionValue = databaseVersionResult.rows[0].server_version;

  const databaseMaxConnectionsResult = await database.query("SHOW max_connections;");
  const databaseMaxConnectionsValue = databaseMaxConnectionsResult.rows[0].max_connections;

  const databaseName = process.env.POSTGRES_DB;
  const databaseOpenedConnectionsResult = await database.query(
    "SELECT count(*)::int FROM pg_stat_activity WHERE datname = $1;",
    [databaseName],
  );
  const databaseOpenedConnectionsValue = databaseOpenedConnectionsResult.rows[0].count;

  const saPath = getServiceAccountPath();
  let saEmail: string | null = null;
  let saValid = false;

  if (saPath) {
    try {
      const parsed = JSON.parse(fs.readFileSync(saPath, "utf-8"));
      saEmail = parsed.client_email || null;
      saValid = Boolean(parsed.private_key && parsed.client_email);
    } catch {
      saValid = false;
    }
  }

  return res.status(200).json({
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: databaseVersionValue,
        max_connections: parseInt(databaseMaxConnectionsValue, 10),
        opened_connections: databaseOpenedConnectionsValue,
      },
      google_drive: {
        configured: Boolean(saPath && saValid),
        sa_file_found: Boolean(saPath),
        sa_file_path: saPath,
        service_account_email: saEmail,
      },
    },
  });
}
