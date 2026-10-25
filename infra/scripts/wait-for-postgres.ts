import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import retry from "async-retry";
import { Client } from "pg";

dotenvExpand.expand(dotenv.config({ path: ".env.development" }));

async function checkPostgres() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
  });

  try {
    await client.connect();
    await client.query("SELECT 1;");
    await client.end();
  } catch (error) {
    await client.end().catch(() => {});
    throw error;
  }
}

async function waitForPostgres() {
  process.stdout.write("🟡 Waiting for Postgres to accept connections");

  await retry(
    async (_bail, attempt) => {
      process.stdout.write(".");
      await checkPostgres();
    },
    {
      retries: 30,
      minTimeout: 500,
      maxTimeout: 2000,
      factor: 1.1,
    },
  );

  console.log("\n🟢 Postgres is ready and accepting connections!\n");
}

waitForPostgres().catch((error) => {
  console.error("\n🔴 Failed to connect to Postgres:", error.message);
  process.exit(1);
});
