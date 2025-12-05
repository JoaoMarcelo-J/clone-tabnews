import database from "infra/database";
import { ValidationError } from "infra/errors";

async function create(userInputValues) {
  await validateUniqueFields(userInputValues.username, userInputValues.email);

  const newUser = await runInsertQuery(userInputValues);
  return newUser;

  async function validateUniqueFields(username, email) {
    const results = await database.query({
      text: `
      SELECT
        username,
        email
      FROM
        users
      WHERE
        LOWER(username) = LOWER($1)
        OR LOWER(email) = LOWER($2)
        `,
      values: [username, email],
    });

    if (results.rowCount > 0) {
      const existingUser = results.rows[0];
      const lowerUsername = username.toLowerCase();
      const lowerEmail = email.toLowerCase();
      const existingLowerUsername = existingUser.username?.toLowerCase();
      const existingLowerEmail = existingUser.email?.toLowerCase();

      if (existingLowerUsername === lowerUsername) {
        throw new ValidationError({
          message: "O username informado já está sendo utilizado.",
          action: "Utilize outro username para realizar o cadastro.",
        });
      }

      if (existingLowerEmail === lowerEmail) {
        throw new ValidationError({
          message: "O email informado já está sendo utilizado.",
          action: "Utilize outro email para realizar o cadastro.",
        });
      }
    }
  }

  async function runInsertQuery(userInputValues) {
    const results = await database.query({
      text: `
      INSERT INTO 
        users (username,email,password) 
      VALUES 
        ($1,$2,$3)
      RETURNING
        *
        `,
      values: [
        userInputValues.username,
        userInputValues.email,
        userInputValues.password,
      ],
    });

    return results.rows[0];
  }
}

const user = {
  create,
};

export default user;
