import { Client, Pool, QueryResult, QueryResultRow } from "pg";

function getConnectionConfig() {
  const useSsl = process.env.POSTGRES_SSL === "true";
  const ssl = useSsl ? { rejectUnauthorized: false } : false;

  return process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl }
    : {
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT || 5432),
        user: process.env.POSTGRES_USER,
        database: process.env.POSTGRES_DB,
        password: process.env.POSTGRES_PASSWORD,
        ssl,
      };
}

// Reutiliza o mesmo Pool entre reloads (HMR) no Next.js em dev e mantém pool único em produção
const globalForPg = globalThis as unknown as { __cdfPgPool?: Pool };

function getPool(): Pool {
  if (!globalForPg.__cdfPgPool) {
    globalForPg.__cdfPgPool = new Pool({
      ...getConnectionConfig(),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return globalForPg.__cdfPgPool;
}

async function getNewClient(): Promise<Client> {
  const client = new Client(getConnectionConfig());
  await client.connect();
  return client;
}

async function query<T extends QueryResultRow = any>(
  queryText: string,
  values?: any[],
): Promise<QueryResult<T>> {
  try {
    return await getPool().query<T>(queryText, values);
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

const database = {
  query,
  getNewClient,
};

export default database;
