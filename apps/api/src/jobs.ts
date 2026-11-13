import { PgBoss } from "pg-boss";

export const EXAMPLE_JOB = "starter.example";

export function createJobQueue(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is required to start the job queue.");
  const max = Number(process.env.JOB_DB_POOL_MAX ?? 5);
  if (!Number.isSafeInteger(max) || max < 1 || max > 50) {
    throw new Error("JOB_DB_POOL_MAX must be an integer from 1 to 50.");
  }
  return new PgBoss({ connectionString, max });
}

export async function enqueueExampleJob(boss: PgBoss, idempotencyKey: string): Promise<void> {
  await boss.send(EXAMPLE_JOB, { idempotencyKey }, { singletonKey: idempotencyKey });
}
