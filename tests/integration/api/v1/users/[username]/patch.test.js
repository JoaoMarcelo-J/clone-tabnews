import orchestrator from "../../orchestrator";
import { version as uuidVersion } from "uuid";
import user from "models/user.js";
import password from "models/password.js";

beforeAll(cleanDatabase);

async function cleanDatabase() {
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
}

describe("PATCH /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With nonexistent username", async () => {
      const response2 = await fetch(
        "http://localhost:3000/api/v1/users/UsuarioInexistente",
        {
          method: "PATCH",
        },
      );

      expect(response2.status).toBe(404);

      const response2Body = await response2.json();
      expect(response2Body).toEqual({
        name: "NotFoundError",
        message: "O username informado não foi encontrado no sistema",
        action: "Verifique se o username está digitado corretamente",
        statusCode: 404,
      });
    });

    test("With Duplicated username", async () => {
      await orchestrator.createUser({
        username: "user1",
      });

      await orchestrator.createUser({
        username: "user2",
      });

      const response3 = await fetch(
        "http://localhost:3000/api/v1/users/user2",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "user1",
          }),
        },
      );

      const response3Body = await response3.json();

      expect(response3.status).toBe(400);

      expect(response3Body).toEqual({
        name: "ValidationError",
        message: "O username informado já está sendo utilizado.",
        action: "Utilize outro username para esta operação.",
        statusCode: 400,
      });
    });

    test("With Duplicated email", async () => {
      await orchestrator.createUser({
        email: "userEmail1@curso.dev",
      });

      const createdUser2 = await orchestrator.createUser({
        email: "userEmail2@curso.dev",
      });

      const response3 = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser2.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "userEmail1@curso.dev",
          }),
        },
      );

      const response3Body = await response3.json();

      expect(response3.status).toBe(400);

      expect(response3Body).toEqual({
        name: "ValidationError",
        message: "O email informado já está sendo utilizado.",
        action: "Utilize outro email para esta operação.",
        statusCode: 400,
      });
    });

    test("With unique username", async () => {
      const uniqueUsername = await orchestrator.createUser();

      const response2 = await fetch(
        `http://localhost:3000/api/v1/users/${uniqueUsername.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "uniqueUser2",
          }),
        },
      );

      expect(response2.status).toBe(200);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        id: response2Body.id,
        username: "uniqueUser2",
        email: uniqueUsername.email,
        password: response2Body.password,
        created_at: response2Body.created_at,
        updated_at: response2Body.updated_at,
      });

      expect(uuidVersion(response2Body.id)).toBe(4);
      expect(Date.parse(response2Body.created_at)).not.toBeNaN();
      expect(Date.parse(response2Body.updated_at)).not.toBeNaN();
      expect(response2Body.updated_at > response2Body.created_at).toBe(true);
    });

    test("With unique email", async () => {
      const uniqueEmail = await orchestrator.createUser();

      const response2 = await fetch(
        "http://localhost:3000/api/v1/users/" + uniqueEmail.username,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "uniqueEmail2@curso.dev",
          }),
        },
      );

      expect(response2.status).toBe(200);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        id: response2Body.id,
        username: uniqueEmail.username,
        email: "uniqueEmail2@curso.dev",
        password: response2Body.password,
        created_at: response2Body.created_at,
        updated_at: response2Body.updated_at,
      });

      expect(uuidVersion(response2Body.id)).toBe(4);
      expect(Date.parse(response2Body.created_at)).not.toBeNaN();
      expect(Date.parse(response2Body.updated_at)).not.toBeNaN();
      expect(response2Body.updated_at > response2Body.created_at).toBe(true);
    });

    test("With new password", async () => {
      const passwordUser = await orchestrator.createUser({
        password: "newPassword",
      });

      const response2 = await fetch(
        "http://localhost:3000/api/v1/users/" + passwordUser.username,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: "newPassword2",
          }),
        },
      );

      expect(response2.status).toBe(200);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        id: response2Body.id,
        username: passwordUser.username,
        email: passwordUser.email,
        password: response2Body.password,
        created_at: response2Body.created_at,
        updated_at: response2Body.updated_at,
      });

      expect(uuidVersion(response2Body.id)).toBe(4);
      expect(Date.parse(response2Body.created_at)).not.toBeNaN();
      expect(Date.parse(response2Body.updated_at)).not.toBeNaN();
      expect(response2Body.updated_at > response2Body.created_at).toBe(true);

      const userInDatabase = await user.findOneByUsername(
        passwordUser.username,
      );
      const correctPasswordMatch = await password.compare(
        "newPassword2",
        userInDatabase.password,
      );

      const incorrectPasswordMatch = await password.compare(
        "newPassword",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });
  });
});
