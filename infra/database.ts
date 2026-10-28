import { Client, QueryResult, QueryResultRow } from "pg";

async function getNewClient(): Promise<Client> {
  const useSsl = process.env.POSTGRES_SSL === "true";
  const ssl = useSsl ? { rejectUnauthorized: false } : false;

  const config = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl }
    : {
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT || 5432),
        user: process.env.POSTGRES_USER,
        database: process.env.POSTGRES_DB,
        password: process.env.POSTGRES_PASSWORD,
        ssl,
      };

  const client = new Client(config);

  await client.connect();
  return client;
}

async function query<T extends QueryResultRow = any>(
  queryText: string,
  values?: any[],
): Promise<QueryResult<T>> {
  let client: Client | undefined;
  try {
    client = await getNewClient();
    const result = await client.query<T>(queryText, values);
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  } finally {
    await client?.end();
  }
}

const database = {
  query,
  getNewClient,
};

export default database;
