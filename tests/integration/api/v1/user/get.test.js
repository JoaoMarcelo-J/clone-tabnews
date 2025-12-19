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
    test("With valid session", async () => {
      const createdUser = await orchestrator.createUser({
        username: "UserWithValidSession",
      });

      const sessionObject = await orchestrator.createSession(createdUser.id);

      const response2 = await fetch("http://localhost:3000/api/v1/user", {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });

      expect(response2.status).toBe(200);

      const cacheControll = response2.headers.get("Cache-Control");
      expect(cacheControll).toBe("no-store,no-cache,max-age=0,must-revalidate");

      const response2Body = await response2.json();
      expect(response2Body).toEqual({
        id: createdUser.id,
        username: "UserWithValidSession",
        email: createdUser.email,
        password: createdUser.password,
        created_at: createdUser.created_at.toISOString(),
        updated_at: createdUser.updated_at.toISOString(),
      });

      expect(uuidVersion(response2Body.id)).toBe(4);
      expect(Date.parse(response2Body.created_at)).not.toBeNaN();
      expect(Date.parse(response2Body.updated_at)).not.toBeNaN();

      //Session renewal assertions
      const renewedSessionObject = await session.findOneValidByToken(
        sessionObject.token,
      );

      expect(
        renewedSessionObject.expires_at > sessionObject.expires_at,
      ).toEqual(true);
      expect(
        renewedSessionObject.updated_at > sessionObject.updated_at,
      ).toEqual(true);

      // Set-Cookie assertions

      const parsedSetCookie = setCookieParser(response2, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: sessionObject.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: "/",
        httpOnly: true,
      });
    });

    test("With valid session created 15 days ago", async () => {
      const halfLifeInMilliseconds = session.EXPIRATION_IN_MILLISECONDS / 2;

      jest.useFakeTimers({
        now: new Date(Date.now() - halfLifeInMilliseconds),
      });

      const createdUser = await orchestrator.createUser({
        username: "UserWithValid15DaysSession",
      });

      const sessionObject = await orchestrator.createSession(createdUser.id);

      jest.useRealTimers();

      // Session created 15 days ago assertions
      const now = new Date();
      const sessionExpiresAt = new Date(sessionObject.expires_at);
      const timeUntilExpiration = sessionExpiresAt.getTime() - now.getTime();
      const expectedTimeUntilExpiration = halfLifeInMilliseconds;

      // Allow a small margin of error (1 hour) for test execution time
      const marginOfError = 60 * 60 * 1000; // 1 hour in milliseconds
      expect(
        Math.abs(timeUntilExpiration - expectedTimeUntilExpiration),
      ).toBeLessThan(marginOfError);

      const response2 = await fetch("http://localhost:3000/api/v1/user", {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });

      expect(response2.status).toBe(200);

      const response2Body = await response2.json();
      expect(response2Body).toEqual({
        id: createdUser.id,
        username: "UserWithValid15DaysSession",
        email: createdUser.email,
        password: createdUser.password,
        created_at: createdUser.created_at.toISOString(),
        updated_at: createdUser.updated_at.toISOString(),
      });

      expect(uuidVersion(response2Body.id)).toBe(4);
      expect(Date.parse(response2Body.created_at)).not.toBeNaN();
      expect(Date.parse(response2Body.updated_at)).not.toBeNaN();

      //Session renewal assertions
      const renewedSessionObject = await session.findOneValidByToken(
        sessionObject.token,
      );

      expect(
        renewedSessionObject.expires_at > sessionObject.expires_at,
      ).toEqual(true);
      expect(
        renewedSessionObject.updated_at > sessionObject.updated_at,
      ).toEqual(true);

      // Set-Cookie assertions

      const parsedSetCookie = setCookieParser(response2, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: sessionObject.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: "/",
        httpOnly: true,
      });
    });

    test("With nonexistent session", async () => {
      const nonexistentToken =
        "ed3c145d53c03a4bc8bac861e0d06fb258c0b69844d3122afd65105f3f5b20932e54371096040f106df9cbcb61098a30";

      const response2 = await fetch("http://localhost:3000/api/v1/user", {
        headers: {
          Cookie: `session_id=${nonexistentToken}`,
        },
      });

      expect(response2.status).toBe(401);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa",
        action: "Verifique se este usuário está logado e tente novamente",
        statusCode: 401,
      });

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
    });

    test("With expired session", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS),
      });

      const createdUser = await orchestrator.createUser({
        username: "UserWithExpiredSession",
      });

      const sessionObject = await orchestrator.createSession(createdUser.id);

      jest.useRealTimers();

      const response2 = await fetch("http://localhost:3000/api/v1/user", {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });

      expect(response2.status).toBe(401);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa",
        action: "Verifique se este usuário está logado e tente novamente",
        statusCode: 401,
      });

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
    });
  });
});
