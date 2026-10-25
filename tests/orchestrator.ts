import retry from "async-retry";
import database from "@/infra/database";

async function waitForAllServices() {
  await waitForWebServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");
      if (response.status !== 200) {
        throw new Error(`Webserver returned status ${response.status}`);
      }
    }
  }
}

// clearDatabase: limpa todas as tabelas entre os testes.
// Equivale ao TransactionTestCase do Django que faz rollback após cada teste,
// mas aqui fazemos DELETE explícito (mais simples e compatível com Jest).
async function clearDatabase() {
  // Truncate em cascata: limpa na ordem correta respeitando FKs
  await database.query(
    "TRUNCATE TABLE sync_runs, enrollments, materials, lessons, modules, courses, password_resets, invites, sessions, users RESTART IDENTITY CASCADE;",
  );
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
};

export default orchestrator;
