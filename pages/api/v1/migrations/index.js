import migrationRunner from "node-pg-migrate";
import { join } from "node:path";
import database from "infra/database.js";

export default async function migrations(req, res) {
  const dbClient = await database.getNewClient();
  const allowedMethod = ["GET", "POST"];

  const defaultMigrationOptions = {
    dbClient,
    dir: join("infra", "migrations"),
    direction: "up",
    verbose: true,
    migrationsTable: "pgmigrations",
  };

  if (allowedMethod.includes(req.method) === false) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (allowedMethod.includes("GET")) {
      const pendingMigrations = await migrationRunner({
        ...defaultMigrationOptions,
        dryRun: true,
      });

      await dbClient.end();

      return res.status(200).json(pendingMigrations);
    }

    if (allowedMethod.includes("POST")) {
      const migratedMigrations = await migrationRunner({
        ...defaultMigrationOptions,
        dryRun: false,
      });

      if (migratedMigrations.length > 0) {
        return res.status(201).json(migratedMigrations);
      }
    }
  } catch {
    throw error;
  } finally {
    await dbClient.end();
  }
}
