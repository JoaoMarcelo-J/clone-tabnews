import database from "infra/database.js";
import { InternalServerError } from "infra/errors.js";

async function status(req, res) {
  try {
    const updatedAt = new Date().toISOString();
    const databaseName = process.env.POSTGRES_DB;

    const databaseVersionResult = await database.query("SHOW server_version;");
    const databaseMaxConnectionsResult = await database.query(
      "SHOW max_connections;",
    );
    const databaseOpenedConnectionsResult = await database.query({
      text: "SELECT COUNT(*)::int FROM pg_stat_activity WHERE datname = $1;",
      values: [databaseName],
    });

    const databaseMaxConnectionsValue = parseInt(
      databaseMaxConnectionsResult.rows[0].max_connections,
    );
    const databaseOpenedConnectionsValue =
      databaseOpenedConnectionsResult.rows[0].count;

    const databaseVersionValue = databaseVersionResult.rows[0].server_version;

    res.status(200).json({
      updated_at: updatedAt,
      dependencies: {
        database: {
          version: databaseVersionValue,
          max_connections: databaseMaxConnectionsValue,
          opened_connections: databaseOpenedConnectionsValue,
        },
      },
    });
  } catch (error) {
    const publicErrorObject = new InternalServerError({
      cause: error,
    });

    console.error(error);
    console.error(publicErrorObject);

    return res.status(500).json({ error: publicErrorObject.message });
  }
}

export default status;
