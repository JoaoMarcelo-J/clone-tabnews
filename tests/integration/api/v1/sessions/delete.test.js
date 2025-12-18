import { version as uuidVersion } from "uuid";
import orchestrator from "../orchestrator";
import session from "models/session";
import setCookieParser from "set-cookie-parser";
beforeAll(cleanDatabase);

async function cleanDatabase() {
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
}

describe("GET /api/v1/user", () => {
  describe("Default user", () => {
    test("With nonexistent session", async () => {
      const nonexistentToken =
        "ed3c145d53c03a4bc8bac861e0d06fb258c0b69844d3122afd65105f3f5b20932e54371096040f106df9cbcb61098a30";

      const response2 = await fetch("http://localhost:3000/api/v1/sessions", {
        headers: {
          Cookie: `session_id=${nonexistentToken}`,
        },
        method: "DELETE",
      });

      expect(response2.status).toBe(401);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa",
        action: "Verifique se este usuário está logado e tente novamente",
        statusCode: 401,
      });
    });

    test("With expired session", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS),
      });

      const createdUser = await orchestrator.createUser();

      const sessionObject = await orchestrator.createSession(createdUser.id);

      jest.useRealTimers();

      const response2 = await fetch("http://localhost:3000/api/v1/sessions", {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
        method: "DELETE",
      });

      expect(response2.status).toBe(401);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa",
        action: "Verifique se este usuário está logado e tente novamente",
        statusCode: 401,
      });
    });

    test("With valid session", async () => {
      const createdUser = await orchestrator.createUser();

      const sessionObject = await orchestrator.createSession(createdUser.id);

      const response2 = await fetch("http://localhost:3000/api/v1/sessions", {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
        method: "DELETE",
      });

      expect(response2.status).toBe(200);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        id: sessionObject.id,
        token: sessionObject.token,
        user_id: sessionObject.user_id,
        expires_at: response2Body.expires_at,
        created_at: response2Body.created_at,
        updated_at: response2Body.updated_at,
      });

      expect(uuidVersion(response2Body.id)).toBe(4);
      expect(Date.parse(response2Body.created_at)).not.toBeNaN();
      expect(Date.parse(response2Body.updated_at)).not.toBeNaN();
      expect(Date.parse(response2Body.expires_at)).not.toBeNaN();

      expect(
        response2Body.expires_at < sessionObject.expires_at.toISOString(),
      ).toEqual(true);
      expect(
        response2Body.updated_at > sessionObject.updated_at.toISOString(),
      ).toEqual(true);

      // Set-Cookie assertions

      const parsedSetCookie = setCookieParser(response2, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        maxAge: -1,
        path: "/",
        httpOnly: true,
      });

      const doubleCheckResponse = await fetch(
        "http://localhost:3000/api/v1/user",
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(doubleCheckResponse.status).toBe(401);

      const doubleCheckResponseBody = await doubleCheckResponse.json();

      expect(doubleCheckResponseBody).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa",
        action: "Verifique se este usuário está logado e tente novamente",
        statusCode: 401,
      });
    });
  });
});
