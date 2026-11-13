import { startTelemetry } from "./telemetry.js";

const shutdownTelemetry = await startTelemetry();
const [{ createJobQueue, EXAMPLE_JOB }, { default: pino }] = await Promise.all([
  import("./jobs.js"),
  import("pino"),
]);
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const boss = createJobQueue();
let stopping = false;

try {
  await boss.start();
  await boss.createQueue(EXAMPLE_JOB);
  await boss.work<{ idempotencyKey: string }>(EXAMPLE_JOB, async (jobs) => {
    // This example deliberately has no external side effects. Real handlers must be idempotent.
    for (const job of jobs) {
      logger.info({ jobId: job.id }, "Processed starter example job");
    }
  });
  logger.info({ queue: EXAMPLE_JOB }, "pg-boss worker started");

  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    try {
      await boss.stop({ graceful: true, timeout: 30_000 });
    } finally {
      await shutdownTelemetry?.();
    }
  };
  const handleShutdown = () => {
    void shutdown().catch((error) => {
      logger.error({ err: error }, "Worker shutdown failed");
      process.exitCode = 1;
    });
  };
  process.once("SIGTERM", handleShutdown);
  process.once("SIGINT", handleShutdown);
} catch (error) {
  logger.fatal({ err: error }, "Worker failed to start");
  await boss.stop({ graceful: false, timeout: 5_000 }).catch(() => undefined);
  await shutdownTelemetry?.();
  process.exitCode = 1;
}
