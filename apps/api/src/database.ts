import { Kysely, PostgresDialect, sql, type Generated, type JSONColumnType } from "kysely";
import pg from "pg";

const { Pool } = pg;

export interface ExampleRecordTable {
  id: Generated<string>;
  payload: JSONColumnType<Record<string, unknown>>;
  created_at: Generated<Date>;
}

export interface Database {
  starter_example_records: ExampleRecordTable;
}

export function createDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to connect to PostgreSQL.");
  }

  const max = Number(process.env.DB_POOL_MAX ?? 10);
  if (!Number.isSafeInteger(max) || max < 1 || max > 100) {
    throw new Error("DB_POOL_MAX must be an integer from 1 to 100.");
  }

  const pool = new Pool({ connectionString, max });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });

  return { db, close: () => db.destroy() };
}

export async function checkDatabaseConnection(db: Kysely<Database>): Promise<void> {
  await sql`select 1`.execute(db);
}
