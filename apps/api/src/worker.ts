import { startTelemetry } from "./telemetry.js";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { metrics, SpanStatusCode, trace } from "@opentelemetry/api";

process.env.OTEL_SERVICE_NAME ??= "starter-worker";
const shutdownTelemetry = await startTelemetry();
const [{ createJobQueue, EXAMPLE_JOB }, { default: pino }] = await Promise.all([
  import("./jobs.js"),
  import("pino"),
]);
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const boss = createJobQueue();
const workerMeter = metrics.getMeter("starter-worker");
const jobCount = workerMeter.createCounter("starter.worker.job.count", {
  description: "Worker job outcomes by queue and outcome.",
});
const jobDuration = workerMeter.createHistogram("starter.worker.job.duration", {
  description: "Worker job processing duration in seconds by queue and outcome.",
  unit: "s",
});
const workerTracer = trace.getTracer("starter-worker");
const processRequestId = randomUUID();
let stopping = false;

try {
  await boss.start();
  await boss.createQueue(EXAMPLE_JOB);
  await boss.work<{ idempotencyKey: string }>(EXAMPLE_JOB, async (jobs) => {
    // This example deliberately has no external side effects. Real handlers must be idempotent.
    for (const job of jobs) {
      const startedAt = performance.now();
      await workerTracer.startActiveSpan(
        "pg-boss.process",
        {
          attributes: {
            "messaging.system": "postgresql",
            "messaging.destination.name": EXAMPLE_JOB,
            "job.entry_point": "pg_boss_worker",
          },
        },
        async (span) => {
          const spanContext = span.spanContext();
          const traceCorrelation = {
            trace_id: spanContext.traceId,
            span_id: spanContext.spanId,
            trace_flags: spanContext.traceFlags.toString(16).padStart(2, "0"),
          };
          try {
            // This example deliberately has no external side effects. Real handlers must be idempotent.
            logger.info(
              {
                event: "job.processed",
                requestId: job.id,
                jobId: job.id,
                entryPoint: "pg_boss_worker",
                queue: EXAMPLE_JOB,
                ...traceCorrelation,
              },
              "Processed starter example job",
            );
            jobCount.add(1, { queue: EXAMPLE_JOB, outcome: "success" });
            jobDuration.record((performance.now() - startedAt) / 1000, {
              queue: EXAMPLE_JOB,
              outcome: "success",
            });
          } catch (error) {
            jobCount.add(1, { queue: EXAMPLE_JOB, outcome: "failure" });
            jobDuration.record((performance.now() - startedAt) / 1000, {
              queue: EXAMPLE_JOB,
              outcome: "failure",
            });
            span.recordException(error instanceof Error ? error : String(error));
            span.setStatus({ code: SpanStatusCode.ERROR });
            logger.error(
              {
                event: "job.failed",
                requestId: job.id,
                jobId: job.id,
                entryPoint: "pg_boss_worker",
                queue: EXAMPLE_JOB,
                errorType: error instanceof Error ? error.name : "UnknownError",
                ...traceCorrelation,
              },
              "Starter job processing failed",
            );
            throw error;
          } finally {
            span.end();
          }
        },
      );
    }
  });
  logger.info(
    {
      event: "worker.started",
      requestId: processRequestId,
      entryPoint: "process_startup",
      queue: EXAMPLE_JOB,
    },
    "pg-boss worker started",
  );

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
