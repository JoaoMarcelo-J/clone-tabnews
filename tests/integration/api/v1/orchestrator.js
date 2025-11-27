import retry from "async-retry";
import database from "infra/database.js";

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

async function waitForAllServices() {
  await waitForWebServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxRetryTime: 5000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");

      if (!response.ok) {
        throw new Error(`Failed to fetch status page: ${response.status}`);
      }
      await response.json();
    }
  }
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
};
export default orchestrator;
