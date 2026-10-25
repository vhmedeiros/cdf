import { Pool, QueryResult, QueryResultRow } from "pg";

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function query<T extends QueryResultRow = any>(
  queryText: string,
  values?: any[],
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(queryText, values);
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function getNewClient() {
  const client = await pool.connect();
  return client;
}

export default {
  query,
  getNewClient,
  pool,
};
