import retry from "async-retry";
import { faker } from "@faker-js/faker";

import database from "infra/database.js";
import migrator from "models/migrator.js";
import user from "models/user.js";
import session from "models/session";

const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST || "localhost"}:${process.env.EMAIL_HTTP_PORT || "1080"}`;

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

async function waitForAllServices() {
  await waitForWebServer();
  await waitForEmailServer();

  async function waitForEmailServer() {
    return retry(fetchEmail, {
      retries: 100,
      maxRetryTime: 5000,
    });

    async function fetchEmail() {
      const response = await fetch(`${emailHttpUrl}/messages`);

      if (!response.ok) {
        throw new Error(`Failed to fetch email server: ${response.status}`);
      }
      await response.json();
    }
  }
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

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

async function createUser(userObject) {
  return await user.create({
    username:
      userObject?.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject?.email || faker.internet.email(),
    password: userObject?.password || "validpassword",
  });
}

async function createSession(userId) {
  return await session.create(userId);
}

async function deleteAllEmail() {
  await fetch(`${emailHttpUrl}/messages`, {
    method: "DELETE",
  });
}

async function getLastEmail() {
  const emailListResponse = await fetch(`${emailHttpUrl}/messages`);
  const emailListBody = await emailListResponse.json();
  const lastEmailItem = emailListBody.pop();

  const emailTextResponse = await fetch(
    `${emailHttpUrl}/messages/${lastEmailItem.id}.plain`,
  );
  const emailTextBody = await emailTextResponse.text();

  lastEmailItem.text = emailTextBody.trimEnd();
  return lastEmailItem;
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
  deleteAllEmail,
  getLastEmail,
};
export default orchestrator;
