import dotenv from "dotenv";
import orchestrator from "tests/integration/api/v1/orchestrator.js";

dotenv.config({ path: ".env.development" });

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});
