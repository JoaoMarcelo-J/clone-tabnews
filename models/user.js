import database from "infra/database";
import password from "models/password.js";
import { ValidationError, NotFoundError } from "infra/errors";

async function findOneById(id) {
  const userFound = await runSelectQuery(id);

  return userFound;

  async function runSelectQuery(id) {
    const results = await database.query({
      text: `
      SELECT
        *
      FROM
        users
      WHERE
        id = $1
      LIMIT
        1
        `,
      values: [id],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "O id informado não foi encontrado no sistema",
        action: "Verifique se o id está digitado corretamente",
      });
    }

    return results.rows[0];
  }
}

async function findOneByUsername(username) {
  const userFound = await runSelectQuery(username);

  return userFound;

  async function runSelectQuery(username) {
    const results = await database.query({
      text: `
      SELECT
        *
      FROM
        users
      WHERE
        LOWER(username) = LOWER($1)
      LIMIT
        1
        `,
      values: [username],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "O username informado não foi encontrado no sistema",
        action: "Verifique se o username está digitado corretamente",
      });
    }

    return results.rows[0];
  }
}

async function findOneByEmail(email) {
  const emailFound = await runSelectQuery(email);

  return emailFound;

  async function runSelectQuery(email) {
    const results = await database.query({
      text: `
      SELECT
        *
      FROM
        users
      WHERE
        LOWER(email) = LOWER($1)
      LIMIT
        1
        `,
      values: [email],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "O email informado não foi encontrado no sistema",
        action: "Verifique se o email está digitado corretamente",
      });
    }

    return results.rows[0];
  }
}

async function create(userInputValues) {
  await validateUniqueFields({
    username: userInputValues.username,
    email: userInputValues.email,
  });
  await hashPasswordInObject(userInputValues);

  const newUser = await runInsertQuery(userInputValues);
  return newUser;

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

async function update(username, userInputValues) {
  const currentUser = await findOneByUsername(username);

  if ("username" in userInputValues) {
    await validateUniqueFields(
      { username: userInputValues.username },
      currentUser.id,
    );
  }

  if ("email" in userInputValues) {
    await validateUniqueFields(
      { email: userInputValues.email },
      currentUser.id,
    );
  }

  if ("password" in userInputValues) {
    await hashPasswordInObject(userInputValues);
  }

  const userWithNewValues = { ...currentUser, ...userInputValues };

  const updatedUser = await runUpdateQuery(userWithNewValues);

  return updatedUser;

  async function runUpdateQuery(userWithNewValues) {
    const results = await database.query({
      text: `
      UPDATE
        users
      SET
       username = $2,
       email = $3,
       password = $4,
       updated_at = timezone('utc',now())
      WHERE
        id = $1
      RETURNING
        *
      `,
      values: [
        userWithNewValues.id,
        userWithNewValues.username,
        userWithNewValues.email,
        userWithNewValues.password,
      ],
    });

    return results.rows[0];
  }
}

async function validateUniqueFields(
  { username: username, email: email },
  excludeUserId = null,
) {
  if (!username && !email) {
    return;
  }
  const fieldConditions = [];
  const values = [];

  if (username) {
    values.push(username);
    fieldConditions.push(`LOWER(username) = LOWER($${values.length})`);
  }

  if (email) {
    values.push(email);
    fieldConditions.push(`LOWER(email) = LOWER($${values.length})`);
  }

  let whereClause = "";
  if (fieldConditions.length > 0) {
    const fieldCondition =
      fieldConditions.length > 1
        ? `(${fieldConditions.join(" OR ")})`
        : fieldConditions[0];

    if (excludeUserId) {
      values.push(excludeUserId);
      whereClause = `WHERE ${fieldCondition} AND id != $${values.length}`;
    } else {
      whereClause = `WHERE ${fieldCondition}`;
    }
  }

  const results = await database.query({
    text: `
      SELECT username, email
      FROM users
      ${whereClause}
    `,
    values,
  });

  if (results.rowCount === 0) return;

  const existingUser = results.rows[0];

  if (
    username &&
    existingUser.username &&
    existingUser.username.toLowerCase() === username.toLowerCase()
  ) {
    throw new ValidationError({
      message: "O username informado já está sendo utilizado.",
      action: "Utilize outro username para esta operação.",
    });
  }

  if (
    email &&
    existingUser.email &&
    existingUser.email.toLowerCase() === email.toLowerCase()
  ) {
    throw new ValidationError({
      message: "O email informado já está sendo utilizado.",
      action: "Utilize outro email para esta operação.",
    });
  }
}

async function hashPasswordInObject(userInputValues) {
  const hashedPassword = await password.hash(userInputValues.password);
  userInputValues.password = hashedPassword;
}

const user = {
  create,
  update,
  findOneByUsername,
  findOneByEmail,
  findOneById,
};

export default user;
