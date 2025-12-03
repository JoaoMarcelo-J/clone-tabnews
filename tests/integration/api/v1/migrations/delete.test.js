import orchestrator from "../orchestrator.js";
beforeAll(cleanDatabase);

async function cleanDatabase() {
  await orchestrator.clearDatabase();
}

describe("DELETE /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("Deleting all migrations", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "DELETE",
      });
      expect(response.status).toBe(405);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "MethodNotAllowedError",
        message: "Método não permitido.",
        action: "Verifique o método HTTP utilizado.",
        statusCode: 405,
      });
    });
  });
});
