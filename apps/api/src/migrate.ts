import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { createDatabase } from "./database.js";

const database = createDatabase();

try {
  const migrator = new Migrator({
    db: database.db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations"),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();
  for (const result of results ?? []) {
    if (result.status === "Success") {
      console.info(`Applied migration ${result.migrationName}.`);
    } else if (result.status === "Error") {
      console.error(`Migration ${result.migrationName} failed.`);
    }
  }

  if (error) throw error;
} catch (error) {
  console.error("Database migration failed.", error);
  process.exitCode = 1;
} finally {
  await database.close();
}
